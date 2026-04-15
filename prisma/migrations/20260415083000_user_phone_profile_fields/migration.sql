ALTER TABLE "User"
ADD COLUMN "phoneCountry" TEXT,
ADD COLUMN "phoneNumber" TEXT,
ADD COLUMN "phoneE164" TEXT,
ADD COLUMN "avatarUrl" TEXT;

CREATE UNIQUE INDEX "User_phoneE164_key" ON "User"("phoneE164");
