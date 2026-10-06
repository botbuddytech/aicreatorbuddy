-- CreateTable
CREATE TABLE "VisualStyle" (
    "id" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VisualStyle_pkey" PRIMARY KEY ("id")
);
