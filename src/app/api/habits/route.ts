import { requireUser } from "@/lib/auth/guard";
import { prisma } from "@/lib/db";

export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const habits = await prisma.habit.findMany({
    where: { userId: auth.user.id },
    orderBy: [{ isActive: "desc" }, { name: "asc" }]
  });

  return Response.json({ habits });
}
