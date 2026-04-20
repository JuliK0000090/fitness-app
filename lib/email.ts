import { Resend } from "resend";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY ?? "re_placeholder");
}
const FROM = process.env.EMAIL_FROM ?? "Vita <noreply@example.com>";
const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

export async function sendVerificationEmail(email: string, token: string) {
  const url = `${APP_URL}/auth/verify-email?token=${token}`;
  await getResend().emails.send({
    from: FROM,
    to: email,
    subject: "Verify your Vita account",
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h1 style="font-size:24px;font-weight:700;margin-bottom:8px">Welcome to Vita 🌿</h1>
        <p style="color:#555;margin-bottom:24px">Click below to verify your email address and activate your account.</p>
        <a href="${url}" style="display:inline-block;background:#A78BFA;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Verify Email</a>
        <p style="color:#999;font-size:12px;margin-top:24px">This link expires in 24 hours. If you didn't create a Vita account, ignore this email.</p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const url = `${APP_URL}/auth/reset-password?token=${token}`;
  await getResend().emails.send({
    from: FROM,
    to: email,
    subject: "Reset your Vita password",
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h1 style="font-size:24px;font-weight:700;margin-bottom:8px">Reset your password</h1>
        <p style="color:#555;margin-bottom:24px">We received a request to reset your Vita password. Click below to choose a new one.</p>
        <a href="${url}" style="display:inline-block;background:#A78BFA;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Reset Password</a>
        <p style="color:#999;font-size:12px;margin-top:24px">This link expires in 1 hour. If you didn't request a reset, ignore this email.</p>
      </div>
    `,
  });
}

export async function sendWeeklyReviewEmail(
  email: string,
  name: string,
  summary: string
) {
  await getResend().emails.send({
    from: FROM,
    to: email,
    subject: `Your Vita weekly review 📊`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h1 style="font-size:24px;font-weight:700;margin-bottom:8px">Week in review, ${name}</h1>
        <div style="color:#333;line-height:1.6">${summary}</div>
        <a href="${APP_URL}/today" style="display:inline-block;background:#A78BFA;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:24px">Open Vita</a>
      </div>
    `,
  });
}
