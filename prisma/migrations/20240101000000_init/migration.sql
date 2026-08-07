-- CreateTable boards
CREATE TABLE "boards" (
    "boardId" TEXT NOT NULL,
    "boardName" TEXT,
    "boardType" TEXT NOT NULL DEFAULT 'scrum',
    "periodDays" INTEGER NOT NULL DEFAULT 30,
    "workflow" JSONB,
    "processedIssues" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "boards_pkey" PRIMARY KEY ("boardId")
);

-- CreateTable snapshots
CREATE TABLE "snapshots" (
    "snapshotId" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "processedIssues" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL DEFAULT 'manual',

    CONSTRAINT "snapshots_pkey" PRIMARY KEY ("snapshotId")
);

-- CreateIndex snapshots_boardId_createdAt_idx
CREATE INDEX "snapshots_boardId_createdAt_idx" ON "snapshots"("boardId", "createdAt");

-- AddForeignKey
ALTER TABLE "snapshots" ADD CONSTRAINT "snapshots_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "boards"("boardId") ON DELETE CASCADE ON UPDATE CASCADE;
