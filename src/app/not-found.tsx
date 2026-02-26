import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";

export default async function NotFound() {
  const user = await getSessionUser();
  redirect(user ? "/daily" : "/login");
}
