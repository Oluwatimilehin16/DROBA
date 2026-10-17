import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import { env } from "../env.js";
import { logger } from "./logger.js";

export interface Mail {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/** Last few mails, kept in memory for tests and local development */
export const outbox: Mail[] = [];

let ses: SESv2Client | null = null;

async function deliver(mail: Mail): Promise<void> {
  switch (env.EMAIL_PROVIDER) {
    case "console":
      outbox.push(mail);
      if (outbox.length > 50) outbox.shift();
      logger.info({ to: mail.to, subject: mail.subject, text: mail.text }, "email (console provider)");
      return;
    case "resend": {
      if (!env.RESEND_API_KEY) throw new Error("RESEND_API_KEY is not set");
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: env.EMAIL_FROM, to: [mail.to], subject: mail.subject, html: mail.html, text: mail.text }),
      });
      if (!r.ok) throw new Error(`Resend ${r.status}: ${await r.text()}`);
      return;
    }
    case "ses": {
      ses ??= new SESv2Client({ region: env.AWS_REGION });
      await ses.send(
        new SendEmailCommand({
          FromEmailAddress: env.EMAIL_FROM,
          Destination: { ToAddresses: [mail.to] },
          Content: { Simple: { Subject: { Data: mail.subject }, Body: { Html: { Data: mail.html }, Text: { Data: mail.text } } } },
        }),
      );
      return;
    }
  }
}

/** Fire-and-forget with retries, so sign-up responds instantly even if the provider is slow.
    For very high volume, swap this for a queue (BullMQ on the same Redis). */
export function sendEmail(mail: Mail) {
  const attempt = async (n: number): Promise<void> => {
    try {
      await deliver(mail);
    } catch (err) {
      if (n >= 3) return logger.error({ err, to: mail.to }, "email failed");
      setTimeout(() => void attempt(n + 1), 1000 * 2 ** n).unref();
    }
  };
  void attempt(1);
}

const shell = (title: string, body: string, cta: { href: string; label: string }) => `<!doctype html>
<html><body style="margin:0;background:#FBF8F4;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1F1414">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table width="100%" style="max-width:480px;background:#fff;border-radius:16px;padding:32px" cellpadding="0" cellspacing="0">
<tr><td style="font-size:22px;font-weight:800;color:#9E0B22;letter-spacing:-.02em">droba</td></tr>
<tr><td style="padding-top:20px;font-size:20px;font-weight:700">${title}</td></tr>
<tr><td style="padding-top:10px;font-size:15px;line-height:1.55;color:#5B4B4B">${body}</td></tr>
<tr><td style="padding-top:24px"><a href="${cta.href}" style="display:inline-block;background:#C8102E;color:#fff;text-decoration:none;font-weight:700;padding:13px 22px;border-radius:999px">${cta.label}</a></td></tr>
<tr><td style="padding-top:24px;font-size:12px;color:#8C7B7B">If the button doesn't work, paste this link into your browser:<br>${cta.href}</td></tr>
</table></td></tr></table></body></html>`;

export const templates = {
  verify(name: string, link: string): Omit<Mail, "to"> {
    return {
      subject: "Confirm your email for Droba",
      html: shell(`Welcome, ${escapeHtml(name.split(" ")[0] ?? name)}`, "Confirm your email so buyers and sellers know you're real. The link works for 24 hours.", { href: link, label: "Confirm email" }),
      text: `Welcome to Droba. Confirm your email (valid 24 hours): ${link}`,
    };
  },
  reset(link: string): Omit<Mail, "to"> {
    return {
      subject: "Reset your Droba password",
      html: shell("Reset your password", "Someone asked to reset the password for this account. If that was you, choose a new one below. The link works for 1 hour. If it wasn't you, ignore this email.", { href: link, label: "Choose a new password" }),
      text: `Reset your Droba password (valid 1 hour): ${link}`,
    };
  },
};

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
