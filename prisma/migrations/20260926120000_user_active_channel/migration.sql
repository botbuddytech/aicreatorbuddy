-- AlterTable
ALTER TABLE "User" ADD COLUMN "activeChannelId" TEXT;

-- CreateIndex
CREATE INDEX "User_activeChannelId_idx" ON "User"("activeChannelId");

-- AddForeignKey
ALTER TABLE "User"
    ADD CONSTRAINT "User_activeChannelId_fkey"
    FOREIGN KEY ("activeChannelId") REFERENCES "YoutubeChannel"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
