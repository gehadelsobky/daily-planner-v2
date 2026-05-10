import { PrismaClient, SystemRole } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = (process.argv[2] ?? process.env.SUPER_ADMIN_EMAIL ?? "").trim().toLowerCase();

  if (!email) {
    throw new Error("Provide an email: npm run prisma:promote-super-admin -- user@example.com");
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      systemRole: true
    }
  });

  if (!user) {
    throw new Error(`No user found for ${email}`);
  }

  if (user.systemRole === SystemRole.super_admin) {
    console.log(
      JSON.stringify(
        {
          ok: true,
          email: user.email,
          name: user.name,
          systemRole: user.systemRole,
          changed: false
        },
        null,
        2
      )
    );
    return;
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      systemRole: SystemRole.super_admin
    },
    select: {
      email: true,
      name: true,
      systemRole: true
    }
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        email: updated.email,
        name: updated.name,
        systemRole: updated.systemRole,
        changed: true
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
