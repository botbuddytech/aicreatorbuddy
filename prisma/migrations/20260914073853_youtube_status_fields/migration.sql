-- AlterTable
ALTER TABLE "YoutubeChannel" ADD COLUMN     "hiddenSubscriberCount" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "YoutubeVideo" ADD COLUMN     "uploadStatus" TEXT NOT NULL DEFAULT 'processed',
ALTER COLUMN "privacyStatus" SET DEFAULT 'private';
