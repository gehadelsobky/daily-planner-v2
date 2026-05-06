import { PrismaClient, WorkspaceType } from "@prisma/client";

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

  const totals = {
    processedUsers: users.length,
    scoreSettingsUpdated: 0,
    dailyEntriesUpdated: 0,
    habitsUpdated: 0,
    notificationsUpdated: 0,
    xpEventsUpdated: 0,
    skippedUsersWithoutWorkspace: 0
  };

  for (const user of users) {
    const workspace = await prisma.workspace.findFirst({
      where: {
        ownerUserId: user.id,
        type: WorkspaceType.personal
      },
      orderBy: {
        createdAt: "asc"
      },
      select: {
        id: true
      }
    });

    if (!workspace) {
      totals.skippedUsersWithoutWorkspace += 1;
      continue;
    }

    const [scoreSettings, dailyEntries, habits, notifications, xpEvents] = await prisma.$transaction([
      prisma.scoreSetting.updateMany({
        where: {
          userId: user.id,
          workspaceId: null
        },
        data: {
          workspaceId: workspace.id
        }
      }),
      prisma.dailyEntry.updateMany({
        where: {
          userId: user.id,
          workspaceId: null
        },
        data: {
          workspaceId: workspace.id
        }
      }),
      prisma.habit.updateMany({
        where: {
          userId: user.id,
          workspaceId: null
        },
        data: {
          workspaceId: workspace.id
        }
      }),
      prisma.notification.updateMany({
        where: {
          userId: user.id,
          workspaceId: null
        },
        data: {
          workspaceId: workspace.id
        }
      }),
      prisma.xPEvent.updateMany({
        where: {
          userId: user.id,
          workspaceId: null
        },
        data: {
          workspaceId: workspace.id
        }
      })
    ]);

    totals.scoreSettingsUpdated += scoreSettings.count;
    totals.dailyEntriesUpdated += dailyEntries.count;
    totals.habitsUpdated += habits.count;
    totals.notificationsUpdated += notifications.count;
    totals.xpEventsUpdated += xpEvents.count;
  }

  console.log(JSON.stringify(totals, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
