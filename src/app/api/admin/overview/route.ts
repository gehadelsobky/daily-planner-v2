import { prisma } from "@/lib/db";
import { requireAdminUser } from "@/lib/admin/access";
import { getAdminOverview } from "@/lib/admin/overview";

export async function GET(req: Request) {
  const auth = await requireAdminUser();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q") ?? undefined;

  const overview = await getAdminOverview(prisma, query);

  return Response.json({
    admin: {
      accessMode: auth.access.accessMode,
      email: auth.user.email
    },
    overview
  });
}
