import type { OAuth2Client } from "google-auth-library";
import { prisma } from "@/lib/db";
import { fetchVideoById } from "@/lib/youtube/api";
import { trackYoutubeCall } from "@/lib/youtube/usage";

export type UploadPrivacy = "private" | "unlisted" | "public";

export async function createResumableUpload(
  auth: OAuth2Client,
  input: {
    title: string;
    description: string;
    tags: string[];
    privacy: UploadPrivacy;
    publishAt: string | null;
    contentLength: number;
    contentType: string;
  },
): Promise<string> {
  const token = await auth.getAccessToken();
  if (!token.token) throw new Error("YouTube access token is missing. Reconnect the channel.");
  const url = new URL("https://www.googleapis.com/upload/youtube/v3/videos");
  url.searchParams.set("uploadType", "resumable");
  url.searchParams.set("part", "snippet,status");
  const scheduled = Boolean(input.publishAt);
  const response = await trackYoutubeCall(
    { operation: "videos.insert", method: "POST", units: 1600 },
    async () => {
      const started = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token.token}`,
          "Content-Type": "application/json; charset=UTF-8",
          "X-Upload-Content-Length": String(input.contentLength),
          "X-Upload-Content-Type": input.contentType || "video/mp4",
        },
        body: JSON.stringify({
          snippet: {
            title: input.title.slice(0, 100),
            description: input.description.slice(0, 5000),
            tags: input.tags.slice(0, 30),
            categoryId: "22",
          },
          status: {
            privacyStatus: scheduled ? "private" : input.privacy,
            selfDeclaredMadeForKids: false,
            ...(scheduled ? { publishAt: input.publishAt } : {}),
          },
        }),
      });
      if (!started.ok) {
        const detail = await started.text();
        throw httpError(started.status, detail.slice(0, 300) || "YouTube did not start the upload.");
      }
      return started;
    },
  );
  const uploadUrl = response.headers.get("location");
  if (!uploadUrl) throw new Error("YouTube did not return an upload URL.");
  return uploadUrl;
}

export async function setYoutubeThumbnail(
  auth: OAuth2Client,
  videoId: string,
  bytes: Buffer,
  mimeType: string,
): Promise<void> {
  const token = await auth.getAccessToken();
  if (!token.token) throw new Error("YouTube access token is missing.");
  const url = new URL("https://www.googleapis.com/upload/youtube/v3/thumbnails/set");
  url.searchParams.set("videoId", videoId);
  url.searchParams.set("uploadType", "media");
  await trackYoutubeCall({ operation: "thumbnails.set", method: "POST", units: 50 }, async () => {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token.token}`,
        "Content-Type": mimeType || "image/jpeg",
      },
      body: new Uint8Array(bytes),
    });
    if (!response.ok) {
      const detail = await response.text();
      throw httpError(response.status, detail.slice(0, 300) || "YouTube rejected the thumbnail.");
    }
  });
}

function httpError(status: number, message: string): Error {
  const error = new Error(message);
  Object.assign(error, { response: { status } });
  return error;
}

export async function rememberUploadedVideo(input: {
  channelDbId: string;
  auth: OAuth2Client;
  youtubeVideoId: string;
  sessionId: string;
}): Promise<void> {
  const match = await fetchVideoById(input.auth, input.youtubeVideoId);
  if (match) {
    const { id: videoId, ...video } = match;
    await prisma.youtubeVideo.upsert({
      where: { channelId_videoId: { channelId: input.channelDbId, videoId } },
      create: { ...video, videoId, channelId: input.channelDbId },
      update: video,
    });
  }
  await prisma.videoSession.update({
    where: { id: input.sessionId },
    data: { youtubeVideoId: input.youtubeVideoId },
  });
}
