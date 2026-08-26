import { env } from "@/env";
import { logger } from "@/lib/utils/logger";

const RESEND_API = "https://api.resend.com/emails";
const FROM = "Rihla Mate <noreply@rihla.my.id>";

export type SendResendEmailParams = {
  to: string;
  subject: string;
  html: string;
  logContext?: Record<string, unknown>;
};

export async function sendResendEmail(params: SendResendEmailParams): Promise<boolean> {
  const { to, subject, html, logContext } = params;

  if (!env.RESEND_API_KEY) {
    logger.warn("[email] RESEND_API_KEY not configured — skipping email", {
      component: "email",
      to,
      ...logContext,
    });
    return false;
  }

  try {
    const response = await fetch(RESEND_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: [to],
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      logger.error(
        "[email] Resend API error",
        {
          component: "email",
          to,
          status: response.status,
          ...logContext,
        },
        new Error(errorBody),
      );
      return false;
    }

    logger.info("[email] Sent", {
      component: "email",
      to,
      ...logContext,
    });
    return true;
  } catch (err) {
    logger.error(
      "[email] Unexpected send error",
      {
        component: "email",
        to,
        ...logContext,
      },
      err,
    );
    return false;
  }
}
