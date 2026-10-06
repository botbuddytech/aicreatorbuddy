#!/usr/bin/env python3
"""Local Qwen3-TTS. Listens on 127.0.0.1 only and keeps one model loaded."""

from __future__ import annotations

import hashlib
import io
import json
import os
import re
import sys
import threading
import traceback
import wave
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

os.environ.setdefault("PYTORCH_ENABLE_MPS_FALLBACK", "1")

ROOT = Path(__file__).resolve().parent
CACHE_DIR = ROOT / "cache"
HOST = "127.0.0.1"
PORT = int(os.environ.get("QWEN_PORT", os.environ.get("CHATTERBOX_PORT", "8765")))
MODEL_ID = "Qwen/Qwen3-TTS-12Hz-0.6B-CustomVoice"
MAX_TEXT_CHARS = 8_000
MAX_JSON_BYTES = 64 * 1024

SPEAKERS = [
    {"id": "Ryan", "name": "Ryan (English)"},
    {"id": "Aiden", "name": "Aiden (English)"},
    {"id": "Vivian", "name": "Vivian (Chinese)"},
    {"id": "Serena", "name": "Serena (Chinese)"},
    {"id": "Uncle_Fu", "name": "Uncle Fu (Chinese)"},
    {"id": "Dylan", "name": "Dylan (Chinese)"},
    {"id": "Eric", "name": "Eric (Chinese)"},
    {"id": "Ono_Anna", "name": "Ono Anna (Japanese)"},
    {"id": "Sohee", "name": "Sohee (Korean)"},
]
SPEAKER_IDS = {item["id"] for item in SPEAKERS}
DEFAULT_SPEAKER = "Ryan"

LOADING_MESSAGE = "Qwen is still loading. The first run downloads the model weights."
FAILED_MESSAGE = "Qwen failed to load. Check the voice server log."

_state_lock = threading.Lock()
_generate_lock = threading.Lock()
_state: dict[str, object] = {"status": "loading", "error": None, "model": None, "device": None}


class RequestError(Exception):
    def __init__(self, status: int, message: str) -> None:
        super().__init__(message)
        self.status = status
        self.message = message


def pick_runtime() -> tuple[str, object, str]:
    import torch

    if torch.cuda.is_available():
        return "cuda:0", torch.bfloat16, "sdpa"
    # float16 sampling on Apple GPUs produces NaNs. float32 is stable.
    mps = getattr(torch.backends, "mps", None)
    if mps is not None and mps.is_available():
        return "mps", torch.float32, "sdpa"
    return "cpu", torch.float32, "sdpa"


def load_model() -> None:
    try:
        device, dtype, attention = pick_runtime()
        print(f"[qwen] loading {MODEL_ID} on {device}", flush=True)
        from qwen_tts import Qwen3TTSModel

        kwargs = {
            "device_map": device,
            "dtype": dtype,
            "attn_implementation": attention,
        }
        try:
            model = Qwen3TTSModel.from_pretrained(MODEL_ID, **kwargs)
        except TypeError:
            kwargs["torch_dtype"] = kwargs.pop("dtype")
            model = Qwen3TTSModel.from_pretrained(MODEL_ID, **kwargs)
        with _state_lock:
            _state["model"] = model
            _state["device"] = device
            _state["status"] = "ready"
            _state["error"] = None
        print(f"[qwen] ready on {device}", flush=True)
    except ModuleNotFoundError:
        traceback.print_exc()
        message = "Qwen is not installed. Run npm install, then npm run dev."
        with _state_lock:
            _state["status"] = "error"
            _state["error"] = message
        print("[qwen] model failed to load", flush=True)
    except Exception:
        traceback.print_exc()
        with _state_lock:
            _state["status"] = "error"
            _state["error"] = FAILED_MESSAGE
        print("[qwen] model failed to load", flush=True)


def model_status() -> str:
    with _state_lock:
        return str(_state["status"])


def model_failure_message() -> str:
    with _state_lock:
        error = _state.get("error")
    if isinstance(error, str) and error.strip():
        return error
    return FAILED_MESSAGE


def list_voices() -> list[dict[str, str]]:
    return list(SPEAKERS)


def cache_path(text: str, voice_id: str) -> Path:
    digest = hashlib.sha256(f"{voice_id}\0{text}".encode()).hexdigest()
    return CACHE_DIR / f"{digest}.wav"


def wav_bytes(samples, sample_rate: int) -> bytes:
    import torch

    audio = samples.detach().cpu().float() if isinstance(samples, torch.Tensor) else torch.as_tensor(samples).float()
    if audio.ndim == 1:
        audio = audio.unsqueeze(0)
    elif audio.ndim > 2:
        audio = audio.reshape(-1, audio.shape[-1])
    if audio.shape[0] > 8 and audio.shape[1] <= 8:
        audio = audio.transpose(0, 1)
    pcm = (audio.clamp(-1, 1) * 32767).to(torch.int16).transpose(0, 1).contiguous()
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as handle:
        handle.setnchannels(int(audio.shape[0]))
        handle.setsampwidth(2)
        handle.setframerate(int(sample_rate))
        handle.writeframes(pcm.numpy().tobytes())
    return buffer.getvalue()


def synthesize(text: str, voice_id: str) -> bytes:
    status = model_status()
    if status == "loading":
        raise RequestError(503, LOADING_MESSAGE)
    if status != "ready":
        raise RequestError(503, model_failure_message())
    if voice_id not in SPEAKER_IDS:
        raise RequestError(400, "Choose a Qwen voice.")

    cached = cache_path(text, voice_id)
    if cached.is_file() and cached.stat().st_size > 44:
        return cached.read_bytes()

    with _generate_lock:
        if cached.is_file() and cached.stat().st_size > 44:
            return cached.read_bytes()
        with _state_lock:
            model = _state["model"]
            status = str(_state["status"])
        if status != "ready" or model is None:
            raise RequestError(503, LOADING_MESSAGE if status == "loading" else model_failure_message())

        wavs, sample_rate = model.generate_custom_voice(
            text=text,
            language="Auto",
            speaker=voice_id,
        )
        data = wav_bytes(wavs[0], sample_rate)
        CACHE_DIR.mkdir(parents=True, exist_ok=True)
        temporary = cached.with_suffix(".wav.tmp")
        try:
            temporary.write_bytes(data)
            temporary.replace(cached)
        except Exception:
            temporary.unlink(missing_ok=True)
            raise
        return data


def read_speak_body(raw: bytes) -> tuple[str, str]:
    try:
        body = json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise RequestError(400, "Invalid request.") from error
    if not isinstance(body, dict):
        raise RequestError(400, "Invalid request.")
    text = body.get("text")
    voice_id = body.get("voiceId") or DEFAULT_SPEAKER
    if not isinstance(text, str) or not isinstance(voice_id, str):
        raise RequestError(400, "Add a script and choose a Qwen voice.")
    text = re.sub(r"\s+", " ", text).strip()
    if not text:
        raise RequestError(400, "Add a script before previewing the voiceover.")
    if len(text) > MAX_TEXT_CHARS:
        raise RequestError(400, "This scene is too long to speak in one pass.")
    if voice_id not in SPEAKER_IDS:
        raise RequestError(400, "Choose a Qwen voice.")
    return text, voice_id


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt: str, *args: object) -> None:
        print(f"[qwen] {self.address_string()} {fmt % args}", flush=True)

    def _read_body(self, limit: int) -> bytes:
        try:
            length = int(self.headers.get("Content-Length", "0") or 0)
        except ValueError as error:
            raise RequestError(400, "Invalid request.") from error
        if length < 0 or length > limit:
            raise RequestError(413, "Request is too large.")
        return self.rfile.read(length)

    def _json(self, payload: dict[str, object], status: int = 200) -> None:
        data = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def _wav(self, data: bytes) -> None:
        self.send_response(200)
        self.send_header("Content-Type", "audio/wav")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self) -> None:  # noqa: N802
        try:
            path = urlparse(self.path).path
            if path == "/health":
                status = model_status()
                payload: dict[str, object] = {"status": status}
                if status == "ready":
                    with _state_lock:
                        payload["device"] = _state["device"]
                self._json(payload)
                return
            if path == "/voices":
                self._json({"voices": list_voices()})
                return
            self._json({"error": "Not found."}, 404)
        except RequestError as error:
            self._json({"error": error.message}, error.status)
        except Exception:
            traceback.print_exc()
            self._json({"error": "Qwen could not complete that request."}, 500)

    def do_POST(self) -> None:  # noqa: N802
        try:
            path = urlparse(self.path).path
            if path == "/speak":
                text, voice_id = read_speak_body(self._read_body(MAX_JSON_BYTES))
                self._wav(synthesize(text, voice_id))
                return
            self._json({"error": "Not found."}, 404)
        except RequestError as error:
            self._json({"error": error.message}, error.status)
        except Exception:
            traceback.print_exc()
            self._json({"error": "Qwen could not speak that line."}, 500)


def main() -> None:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    try:
        server = ThreadingHTTPServer((HOST, PORT), Handler)
    except OSError as error:
        if getattr(error, "errno", None) in {48, 98, 10048}:
            print(f"[qwen] already running on http://{HOST}:{PORT}", flush=True)
            raise SystemExit(0) from error
        raise
    threading.Thread(target=load_model, name="qwen-load", daemon=True).start()
    print(f"[qwen] listening on http://{HOST}:{PORT}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[qwen] stopped", flush=True)
        server.shutdown()


if __name__ == "__main__":
    main()
