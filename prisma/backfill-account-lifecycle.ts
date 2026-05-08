import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { syncUserLifecycle } from "../src/lib/saas/account-lifecycle";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      updatedAt: true,
      lastLoginAt: true,
      lastActiveAt: true
    }
  });

  let processedUsers = 0;
  let seededLoginDates = 0;
  let seededActivityDates = 0;
  let completedOnboarding = 0;

  for (const user of users) {
    processedUsers += 1;

    if (!user.lastLoginAt || !user.lastActiveAt) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          ...(user.lastLoginAt ? {} : { lastLoginAt: user.updatedAt }),
          ...(user.lastActiveAt ? {} : { lastActiveAt: user.updatedAt })
        }
      });
      if (!user.lastLoginAt) seededLoginDates += 1;
      if (!user.lastActiveAt) seededActivityDates += 1;
    }

    const lifecycle = await syncUserLifecycle(prisma, user.id);
    if (lifecycle.onboardingCompletedAt) {
      completedOnboarding += 1;
    }
  }

  console.log(
    JSON.stringify(
      {
        processedUsers,
        seededLoginDates,
        seededActivityDates,
        completedOnboarding
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
