import ResetPasswordPageClient from "@/components/auth/reset-password-page-client";
import { isForgotPasswordEnabled } from "@/lib/features";
import { notFound } from "next/navigation";

export default function ResetPasswordPage() {
  if (!isForgotPasswordEnabled()) {
    notFound();
  }

  return <ResetPasswordPageClient />;
}
