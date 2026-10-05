export type SceneClipUploadResult = {
  url: string;
  storagePath: string;
  clipId: string;
};

export function uploadSceneClipFile(
  sessionId: string,
  sceneId: string,
  file: File,
  previousStoragePath: string | null,
  onProgress: (percent: number) => void,
): Promise<SceneClipUploadResult> {
  return new Promise((resolve, reject) => {
    const body = new FormData();
    body.set("file", file);
    if (previousStoragePath) body.set("previousStoragePath", previousStoragePath);

    const xhr = new XMLHttpRequest();
    xhr.open(
      "POST",
      `/api/create/sessions/${encodeURIComponent(sessionId)}/scenes/${encodeURIComponent(sceneId)}/clip`,
    );
    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || event.total <= 0) return;
      onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
    };
    xhr.onerror = () => reject(new Error("Could not upload that clip."));
    xhr.onload = () => {
      let payload: (SceneClipUploadResult & { error?: string }) | null = null;
      try {
        payload = JSON.parse(xhr.responseText) as SceneClipUploadResult & { error?: string };
      } catch {
        payload = null;
      }
      if (xhr.status < 200 || xhr.status >= 300 || !payload?.url || !payload.storagePath) {
        reject(new Error(payload?.error || "Could not upload that clip."));
        return;
      }
      onProgress(100);
      resolve({
        url: payload.url,
        storagePath: payload.storagePath,
        clipId: payload.clipId,
      });
    };
    xhr.send(body);
  });
}

export async function deleteSceneClipFile(
  sessionId: string,
  sceneId: string,
  storagePath: string,
): Promise<void> {
  const response = await fetch(
    `/api/create/sessions/${encodeURIComponent(sessionId)}/scenes/${encodeURIComponent(sceneId)}/clip`,
    {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ storagePath }),
    },
  );
  const payload = (await response.json().catch(() => null)) as { error?: string } | null;
  if (!response.ok) {
    throw new Error(payload?.error || "Could not delete that clip.");
  }
}
