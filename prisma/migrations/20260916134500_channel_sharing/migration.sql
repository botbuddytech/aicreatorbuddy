-- CreateTable
CREATE TABLE "ChannelShare" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "userId" TEXT,
    "invitedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),

    CONSTRAINT "ChannelShare_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChannelShare_channelId_email_key"
    ON "ChannelShare"("channelId", "email");

-- CreateIndex
CREATE INDEX "ChannelShare_userId_idx" ON "ChannelShare"("userId");

-- CreateIndex
CREATE INDEX "ChannelShare_email_idx" ON "ChannelShare"("email");

-- AddForeignKey
ALTER TABLE "ChannelShare"
    ADD CONSTRAINT "ChannelShare_channelId_fkey"
    FOREIGN KEY ("channelId") REFERENCES "YoutubeChannel"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelShare"
    ADD CONSTRAINT "ChannelShare_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelShare"
    ADD CONSTRAINT "ChannelShare_invitedById_fkey"
    FOREIGN KEY ("invitedById") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
