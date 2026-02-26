import LoginPageClient from "@/components/auth/login-page-client";
import { isForgotPasswordEnabled } from "@/lib/features";

export default function LoginPage() {
  return <LoginPageClient forgotEnabled={isForgotPasswordEnabled()} />;
}
