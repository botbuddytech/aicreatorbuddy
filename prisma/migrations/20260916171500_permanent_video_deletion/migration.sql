-- CreateTable
CREATE TABLE "DeletedVideoSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeletedVideoSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DeletedVideoSession_userId_deletedAt_idx"
    ON "DeletedVideoSession"("userId", "deletedAt" DESC);

-- AddForeignKey
ALTER TABLE "DeletedVideoSession"
    ADD CONSTRAINT "DeletedVideoSession_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Stale tabs and delayed telemetry must never recreate a permanently deleted session.
CREATE FUNCTION "prevent_deleted_video_session_recreation"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM "DeletedVideoSession"
        WHERE "id" = NEW."id"
    ) THEN
        RAISE EXCEPTION 'video session has been permanently deleted'
            USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER "prevent_deleted_video_session_recreation"
BEFORE INSERT ON "VideoSession"
FOR EACH ROW
EXECUTE FUNCTION "prevent_deleted_video_session_recreation"();
