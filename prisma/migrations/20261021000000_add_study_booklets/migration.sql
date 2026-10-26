-- CreateEnum
CREATE TYPE "BookletStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ChapterProcessStatus" AS ENUM ('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED');

-- CreateEnum
CREATE TYPE "ChapterReviewStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'APPROVED');

-- CreateEnum
CREATE TYPE "BookletItemKind" AS ENUM ('SUMMARY', 'NOTE', 'KEY_CONCEPT', 'TABLE', 'FLOWCHART', 'FLASHCARD');

-- CreateEnum
CREATE TYPE "BookletItemStatus" AS ENUM ('DRAFT', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "bookletChapterId" TEXT,
ADD COLUMN     "sourcePages" INTEGER[];

-- CreateTable
CREATE TABLE "Booklet" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "publisher" TEXT,
    "description" TEXT NOT NULL DEFAULT '',
    "status" "BookletStatus" NOT NULL DEFAULT 'DRAFT',
    "totalPages" INTEGER,
    "sourcePath" TEXT,
    "licenseConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "licenseNote" TEXT,
    "accessExamId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booklet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookletChapter" (
    "id" TEXT NOT NULL,
    "bookletId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "pdfPageFrom" INTEGER NOT NULL,
    "pdfPageTo" INTEGER NOT NULL,
    "processStatus" "ChapterProcessStatus" NOT NULL DEFAULT 'PENDING',
    "processStage" TEXT,
    "processError" TEXT,
    "processedAt" TIMESTAMP(3),
    "model" TEXT,
    "verification" JSONB,
    "reviewStatus" "ChapterReviewStatus" NOT NULL DEFAULT 'DRAFT',
    "reviewerName" TEXT,
    "reviewerNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "isFreePreview" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookletChapter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookletPage" (
    "id" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "pdfPage" INTEGER NOT NULL,
    "printedPage" TEXT,
    "markdown" TEXT NOT NULL,

    CONSTRAINT "BookletPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookletFigure" (
    "id" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "pdfPage" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "caption" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "approved" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "BookletFigure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookletItem" (
    "id" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "kind" "BookletItemKind" NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "data" JSONB NOT NULL,
    "pages" INTEGER[],
    "status" "BookletItemStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookletItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookletProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "completedModes" TEXT[],
    "lastMode" TEXT,
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookletProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookletBookmark" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL DEFAULT '',
    "label" TEXT NOT NULL,
    "pdfPage" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookletBookmark_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Booklet_slug_key" ON "Booklet"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Booklet_accessExamId_key" ON "Booklet"("accessExamId");

-- CreateIndex
CREATE INDEX "BookletChapter_bookletId_position_idx" ON "BookletChapter"("bookletId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "BookletChapter_bookletId_slug_key" ON "BookletChapter"("bookletId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "BookletPage_chapterId_pdfPage_key" ON "BookletPage"("chapterId", "pdfPage");

-- CreateIndex
CREATE INDEX "BookletFigure_chapterId_idx" ON "BookletFigure"("chapterId");

-- CreateIndex
CREATE INDEX "BookletItem_chapterId_kind_status_idx" ON "BookletItem"("chapterId", "kind", "status");

-- CreateIndex
CREATE UNIQUE INDEX "BookletProgress_userId_chapterId_key" ON "BookletProgress"("userId", "chapterId");

-- CreateIndex
CREATE UNIQUE INDEX "BookletBookmark_userId_chapterId_itemId_key" ON "BookletBookmark"("userId", "chapterId", "itemId");

-- CreateIndex
CREATE INDEX "Question_bookletChapterId_idx" ON "Question"("bookletChapterId");

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_bookletChapterId_fkey" FOREIGN KEY ("bookletChapterId") REFERENCES "BookletChapter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booklet" ADD CONSTRAINT "Booklet_accessExamId_fkey" FOREIGN KEY ("accessExamId") REFERENCES "Exam"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookletChapter" ADD CONSTRAINT "BookletChapter_bookletId_fkey" FOREIGN KEY ("bookletId") REFERENCES "Booklet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookletPage" ADD CONSTRAINT "BookletPage_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "BookletChapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookletFigure" ADD CONSTRAINT "BookletFigure_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "BookletChapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookletItem" ADD CONSTRAINT "BookletItem_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "BookletChapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookletProgress" ADD CONSTRAINT "BookletProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookletProgress" ADD CONSTRAINT "BookletProgress_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "BookletChapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookletBookmark" ADD CONSTRAINT "BookletBookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookletBookmark" ADD CONSTRAINT "BookletBookmark_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "BookletChapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

