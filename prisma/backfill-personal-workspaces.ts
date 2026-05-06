import { PrismaClient } from "@prisma/client";
import { ensurePersonalWorkspace } from "../src/lib/saas/personal-workspace";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true
    },
    orderBy: {
      createdAt: "asc"
    }
  });

  let createdWorkspaces = 0;
  let createdMemberships = 0;
  let createdSubscriptions = 0;

  for (const user of users) {
    const result = await prisma.$transaction((tx) =>
      ensurePersonalWorkspace(tx, {
        id: user.id,
        email: user.email,
        name: user.name
      })
    );

    if (result.createdWorkspace) createdWorkspaces += 1;
    if (result.createdMembership) createdMemberships += 1;
    if (result.createdSubscription) createdSubscriptions += 1;
  }

  console.log(
    JSON.stringify(
      {
        processedUsers: users.length,
        createdWorkspaces,
        createdMemberships,
        createdSubscriptions
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
