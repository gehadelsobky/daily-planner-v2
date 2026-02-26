import ForgotPasswordPageClient from "@/components/auth/forgot-password-page-client";
import { isForgotPasswordEnabled } from "@/lib/features";
import { notFound } from "next/navigation";

export default function ForgotPasswordPage() {
  if (!isForgotPasswordEnabled()) {
    notFound();
  }

  return <ForgotPasswordPageClient />;
}
