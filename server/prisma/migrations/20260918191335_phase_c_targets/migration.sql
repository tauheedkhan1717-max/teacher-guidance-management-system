-- CreateTable
CREATE TABLE "GroupTarget" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "type" "ProgressType" NOT NULL,
    "totalTarget" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "GroupTarget_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GroupTarget_groupId_type_key" ON "GroupTarget"("groupId", "type");

-- AddForeignKey
ALTER TABLE "GroupTarget" ADD CONSTRAINT "GroupTarget_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
