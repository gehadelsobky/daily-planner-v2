import RegisterPageClient from "@/components/auth/register-page-client";
import { isForgotPasswordEnabled } from "@/lib/features";

export default function RegisterPage() {
  return <RegisterPageClient forgotEnabled={isForgotPasswordEnabled()} />;
}
