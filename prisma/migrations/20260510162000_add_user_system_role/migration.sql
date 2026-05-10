CREATE TYPE "SystemRole" AS ENUM ('user', 'super_admin');

ALTER TABLE "User"
ADD COLUMN "systemRole" "SystemRole" NOT NULL DEFAULT 'user';
