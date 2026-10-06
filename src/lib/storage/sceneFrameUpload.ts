export type StartFrameUploadResult = {
  url: string;
  storagePath: string;
  frameId: string;
};

export function uploadStartFrameFile(
  sessionId: string,
  sceneId: string,
  file: File,
  previousStoragePath: string | null,
  onProgress: (percent: number) => void,
): Promise<StartFrameUploadResult> {
  return new Promise((resolve, reject) => {
    const body = new FormData();
    body.set("file", file);
    if (previousStoragePath) body.set("previousStoragePath", previousStoragePath);

    const xhr = new XMLHttpRequest();
    xhr.open(
      "POST",
      `/api/create/sessions/${encodeURIComponent(sessionId)}/scenes/${encodeURIComponent(sceneId)}/frame`,
    );
    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || event.total <= 0) return;
      onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
    };
    xhr.onerror = () => reject(new Error("Could not upload that image."));
    xhr.onload = () => {
      let payload: (StartFrameUploadResult & { error?: string }) | null = null;
      try {
        payload = JSON.parse(xhr.responseText) as StartFrameUploadResult & { error?: string };
      } catch {
        payload = null;
      }
      if (xhr.status < 200 || xhr.status >= 300 || !payload?.url || !payload.storagePath) {
        reject(new Error(payload?.error || "Could not upload that image."));
        return;
      }
      onProgress(100);
      resolve({
        url: payload.url,
        storagePath: payload.storagePath,
        frameId: payload.frameId,
      });
    };
    xhr.send(body);
  });
}

export async function deleteStartFrameFile(
  sessionId: string,
  sceneId: string,
  storagePath: string,
): Promise<void> {
  const response = await fetch(
    `/api/create/sessions/${encodeURIComponent(sessionId)}/scenes/${encodeURIComponent(sceneId)}/frame`,
    {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ storagePath }),
    },
  );
  const payload = (await response.json().catch(() => null)) as { error?: string } | null;
  if (!response.ok) {
    throw new Error(payload?.error || "Could not delete that image.");
  }
}
