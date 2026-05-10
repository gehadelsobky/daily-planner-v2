import { Prisma, PrismaClient } from "@prisma/client";

type DbClient = PrismaClient;

type AdminAuditInput = {
  adminUserId: string;
  action: string;
  targetType: string;
  targetId: string;
  details?: Prisma.InputJsonValue;
};

export async function recordAdminAuditLog(prisma: DbClient, input: AdminAuditInput) {
  return prisma.adminAuditLog.create({
    data: {
      adminUserId: input.adminUserId,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      details: input.details ?? ({} as Prisma.InputJsonObject)
    }
  });
}
