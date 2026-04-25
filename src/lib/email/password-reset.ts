import nodemailer from "nodemailer";

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing ${name}`);
  }
  return value;
}

export function isPasswordResetEmailConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS &&
      process.env.EMAIL_FROM
  );
}

function createTransport() {
  const host = getRequiredEnv("SMTP_HOST");
  const port = Number(getRequiredEnv("SMTP_PORT"));
  const user = getRequiredEnv("SMTP_USER");
  const pass = getRequiredEnv("SMTP_PASS");
  const secure =
    process.env.SMTP_SECURE === "true" ||
    (!process.env.SMTP_SECURE && Number.isFinite(port) && port === 465);

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass
    }
  });
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function sendPasswordResetEmail({
  to,
  resetUrl,
  expiresInMinutes = 30
}: {
  to: string;
  resetUrl: string;
  expiresInMinutes?: number;
}) {
  const from = getRequiredEnv("EMAIL_FROM");
  const appName = process.env.EMAIL_APP_NAME?.trim() || "Daily Planner";
  const transport = createTransport();

  const safeUrl = escapeHtml(resetUrl);
  const safeAppName = escapeHtml(appName);

  await transport.sendMail({
    from,
    to,
    subject: `${appName} password reset`,
    text: [
      `You requested a password reset for ${appName}.`,
      "",
      `Use this link within ${expiresInMinutes} minutes:`,
      resetUrl,
      "",
      "If you did not request this, you can ignore this email."
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;background:#f5f9ff;padding:32px;color:#0a0087;">
        <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid rgba(23,69,199,0.14);border-radius:24px;padding:32px;">
          <p style="font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#5b678f;margin:0 0 12px;">${safeAppName}</p>
          <h1 style="font-size:28px;line-height:1.2;margin:0 0 16px;color:#0a0087;">Reset your password</h1>
          <p style="font-size:15px;line-height:1.7;color:#3f4d78;margin:0 0 24px;">
            We received a request to reset your password. Use the button below within ${expiresInMinutes} minutes.
          </p>
          <p style="margin:0 0 24px;">
            <a href="${safeUrl}" style="display:inline-block;background:linear-gradient(135deg,#1745C7,#0a0087);color:#ffffff;text-decoration:none;padding:14px 22px;border-radius:14px;font-weight:700;">
              Reset password
            </a>
          </p>
          <p style="font-size:13px;line-height:1.7;color:#5b678f;margin:0 0 12px;">
            If the button does not work, copy and paste this link into your browser:
          </p>
          <p style="font-size:13px;line-height:1.7;word-break:break-all;color:#1745C7;margin:0 0 20px;">
            ${safeUrl}
          </p>
          <p style="font-size:13px;line-height:1.7;color:#5b678f;margin:0;">
            If you did not request this reset, you can safely ignore this email.
          </p>
        </div>
      </div>
    `
  });
}
