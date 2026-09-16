-- YoutubeVideo is a cache of YouTube API data. Clear it before changing its
-- identity model; the next channel sync repopulates it.
DELETE FROM "YoutubeVideo";

-- Add channel ownership without losing rows that predate real application auth.
ALTER TABLE "YoutubeChannel" ADD COLUMN "userId" TEXT;

UPDATE "YoutubeChannel" AS channel
SET "userId" = app_user."id"
FROM "User" AS app_user
WHERE lower(app_user."email") = lower(channel."googleEmail");

-- An owner cannot be inferred safely for unmatched legacy rows.
DELETE FROM "YoutubeChannel" WHERE "userId" IS NULL;

DROP INDEX "YoutubeChannel_workspaceId_idx";
DROP INDEX "YoutubeChannel_channelId_key";

ALTER TABLE "YoutubeChannel"
  ALTER COLUMN "userId" SET NOT NULL,
  DROP COLUMN "workspaceId";

ALTER TABLE "YoutubeChannel"
  ADD CONSTRAINT "YoutubeChannel_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "YoutubeChannel_userId_channelId_key"
  ON "YoutubeChannel"("userId", "channelId");
CREATE INDEX "YoutubeChannel_userId_idx" ON "YoutubeChannel"("userId");

-- A video may be cached once per user-owned channel, so its YouTube id is no
-- longer globally unique. Prisma supplies cuid() values for the new primary key.
ALTER TABLE "YoutubeVideo" DROP CONSTRAINT "YoutubeVideo_pkey";
ALTER TABLE "YoutubeVideo" RENAME COLUMN "id" TO "videoId";
ALTER TABLE "YoutubeVideo" ADD COLUMN "id" TEXT NOT NULL;
ALTER TABLE "YoutubeVideo"
  ADD CONSTRAINT "YoutubeVideo_pkey" PRIMARY KEY ("id");

CREATE UNIQUE INDEX "YoutubeVideo_channelId_videoId_key"
  ON "YoutubeVideo"("channelId", "videoId");
