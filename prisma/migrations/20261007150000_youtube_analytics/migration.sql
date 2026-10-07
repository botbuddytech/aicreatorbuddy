ALTER TABLE "YoutubeVideo" ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "YoutubeVideo" ADD COLUMN "categoryId" TEXT;
ALTER TABLE "YoutubeVideo" ADD COLUMN "publishAt" TIMESTAMP(3);

CREATE INDEX "YoutubeVideo_channelId_publishAt_idx" ON "YoutubeVideo"("channelId", "publishAt");

CREATE TABLE "YoutubePlaylist" (
    "id" TEXT NOT NULL,
    "playlistId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "thumbnailUrl" TEXT,
    "itemCount" INTEGER NOT NULL DEFAULT 0,
    "privacyStatus" TEXT NOT NULL DEFAULT 'private',
    "publishedAt" TIMESTAMP(3),
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "YoutubePlaylist_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "YoutubePlaylist_channelId_playlistId_key" ON "YoutubePlaylist"("channelId", "playlistId");
CREATE INDEX "YoutubePlaylist_channelId_idx" ON "YoutubePlaylist"("channelId");

ALTER TABLE "YoutubePlaylist" ADD CONSTRAINT "YoutubePlaylist_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "YoutubeChannel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "YoutubeAnalyticsSnapshot" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "reportKey" TEXT NOT NULL,
    "rangeKey" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "errorMessage" TEXT,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "YoutubeAnalyticsSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "YoutubeAnalyticsSnapshot_channelId_reportKey_rangeKey_key" ON "YoutubeAnalyticsSnapshot"("channelId", "reportKey", "rangeKey");
CREATE INDEX "YoutubeAnalyticsSnapshot_channelId_fetchedAt_idx" ON "YoutubeAnalyticsSnapshot"("channelId", "fetchedAt");

ALTER TABLE "YoutubeAnalyticsSnapshot" ADD CONSTRAINT "YoutubeAnalyticsSnapshot_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "YoutubeChannel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "VideoSession" ADD COLUMN "youtubeVideoId" TEXT;
CREATE INDEX "VideoSession_youtubeVideoId_idx" ON "VideoSession"("youtubeVideoId");
