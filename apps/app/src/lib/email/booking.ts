import { Resend } from "resend";
import { getTranslations } from "next-intl/server";
import { env } from "@/env";
import { logger } from "@/lib/utils/logger";

export interface SendBookingConfirmationParams {
  customerName: string;
  customerEmail: string;
  packageTitle: string;
  departureDate: string;
  travelers: number;
  totalPrice: string;
  bookingId: string;
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr + "T00:00:00Z");
    return date.toLocaleDateString("id-ID", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "Asia/Jakarta",
    });
  } catch {
    return dateStr;
  }
}

export async function sendBookingConfirmation(
  params: SendBookingConfirmationParams,
  locale: string = "en",
): Promise<void> {
  try {
    if (!env.RESEND_API_KEY) {
      logger.warn("[email] RESEND_API_KEY not configured — skipping booking confirmation email", {
        component: "email",
        bookingId: params.bookingId,
      });
      return;
    }

    const resend = new Resend(env.RESEND_API_KEY);
    const formattedDate = formatDate(params.departureDate);
    const t = await getTranslations({ locale, namespace: "email.booking" });

    const { error } = await resend.emails.send({
      from: "Rihla Mate <noreply@rihla-mate.com>",
      to: [params.customerEmail],
      subject: t("subject", { package: params.packageTitle }),
      html: `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
          <tr>
            <td style="background-color:#0f766e;padding:32px 40px;">
              <h1 style="color:#ffffff;font-size:24px;font-weight:700;margin:0;">${t("heading")}</h1>
              <p style="color:#ccfbf1;font-size:14px;margin:8px 0 0;">${t("subheading")}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px;">
              <p style="color:#374151;font-size:16px;margin:0 0 8px;">Dear <strong>${params.customerName}</strong>,</p>
              <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 24px;">
                ${t("bodyIntro")}
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
                <tr style="background-color:#f9fafb;">
                  <td style="padding:12px 16px;color:#6b7280;font-size:13px;font-weight:500;width:140px;">${t("package")}</td>
                  <td style="padding:12px 16px;color:#111827;font-size:14px;font-weight:600;">${params.packageTitle}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;color:#6b7280;font-size:13px;font-weight:500;border-top:1px solid #e5e7eb;">${t("departureDate")}</td>
                  <td style="padding:12px 16px;color:#111827;font-size:14px;border-top:1px solid #e5e7eb;">${formattedDate}</td>
                </tr>
                <tr style="background-color:#f9fafb;">
                  <td style="padding:12px 16px;color:#6b7280;font-size:13px;font-weight:500;border-top:1px solid #e5e7eb;">${t("travelers")}</td>
                  <td style="padding:12px 16px;color:#111827;font-size:14px;border-top:1px solid #e5e7eb;">${params.travelers} orang</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;color:#6b7280;font-size:13px;font-weight:500;border-top:1px solid #e5e7eb;">${t("totalPrice")}</td>
                  <td style="padding:12px 16px;color:#111827;font-size:14px;border-top:1px solid #e5e7eb;">Rp ${Number(params.totalPrice).toLocaleString("id-ID")}</td>
                </tr>
                <tr style="background-color:#f9fafb;">
                  <td style="padding:12px 16px;color:#6b7280;font-size:13px;font-weight:500;border-top:1px solid #e5e7eb;">${t("bookingId")}</td>
                  <td style="padding:12px 16px;color:#111827;font-size:14px;border-top:1px solid #e5e7eb;font-family:monospace;">${params.bookingId}</td>
                </tr>
              </table>

              <p style="color:#6b7280;font-size:13px;line-height:1.6;margin:24px 0 0;">
                ${t("footerHelp")}
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;">
              <p style="color:#9ca3af;font-size:12px;margin:0;">
                ${t("footerCopyright", { year: new Date().getFullYear() })}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
    });

    if (error) {
      logger.error(
        "[email] Failed to send booking confirmation",
        {
          component: "email",
          bookingId: params.bookingId,
          customerEmail: params.customerEmail,
        },
        error,
      );
      return;
    }

    logger.info("[email] Booking confirmation sent", {
      component: "email",
      bookingId: params.bookingId,
      customerEmail: params.customerEmail,
    });
  } catch (err) {
    logger.error(
      "[email] Unexpected error sending booking confirmation",
      {
        component: "email",
        bookingId: params.bookingId,
        customerEmail: params.customerEmail,
      },
      err,
    );
  }
}
