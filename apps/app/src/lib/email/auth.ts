import { getTranslations } from "next-intl/server";
import { sendResendEmail } from "@/lib/email/resend";

export type SendPasswordSetupEmailParams = {
  to: string;
  name: string;
  url: string;
  locale?: string;
  kind?: "invite" | "reset";
};

function shellHtml(opts: {
  lang: string;
  heading: string;
  subheading: string;
  greeting: string;
  body: string;
  cta: string;
  url: string;
  footer: string;
}): string {
  return `<!DOCTYPE html>
<html lang="${opts.lang}">
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
              <h1 style="color:#ffffff;font-size:24px;font-weight:700;margin:0;">${opts.heading}</h1>
              <p style="color:#ccfbf1;font-size:14px;margin:8px 0 0;">${opts.subheading}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px;">
              <p style="color:#374151;font-size:16px;margin:0 0 8px;">${opts.greeting}</p>
              <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 24px;">${opts.body}</p>
              <p style="margin:0 0 24px;">
                <a href="${opts.url}" style="display:inline-block;background-color:#0f766e;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 24px;border-radius:8px;">${opts.cta}</a>
              </p>
              <p style="color:#9ca3af;font-size:12px;line-height:1.5;margin:0;word-break:break-all;">${opts.url}</p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;">
              <p style="color:#9ca3af;font-size:12px;margin:0;">${opts.footer}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendPasswordSetupEmail(
  params: SendPasswordSetupEmailParams,
): Promise<boolean> {
  const locale = params.locale ?? "id";
  const kind = params.kind ?? "reset";
  const t = await getTranslations({ locale, namespace: "email.auth" });
  const ns = kind === "invite" ? "invite" : "reset";

  const html = shellHtml({
    lang: locale === "ar" ? "ar" : locale === "en" ? "en" : "id",
    heading: t(`${ns}.heading`),
    subheading: t(`${ns}.subheading`),
    greeting: t(`${ns}.greeting`, { name: params.name }),
    body: t(`${ns}.body`),
    cta: t(`${ns}.cta`),
    url: params.url,
    footer: t("footerCopyright", { year: new Date().getFullYear() }),
  });

  return sendResendEmail({
    to: params.to,
    subject: t(`${ns}.subject`),
    html,
    logContext: { kind, emailType: "password-setup" },
  });
}
