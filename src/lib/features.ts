export function isForgotPasswordEnabled(): boolean {
  return process.env.ENABLE_FORGOT_PASSWORD === "true";
}
