import { signPayload } from "./signing";
import type { LicensePayload } from "@rihla-mate/shared";

export async function generateLicenseKey(
  payload: LicensePayload,
): Promise<string> {
  const privateKeyHex = process.env.LICENSE_PRIVATE_KEY;
  if (!privateKeyHex) {
    throw new Error("LICENSE_PRIVATE_KEY environment variable is not set");
  }

  const privateKey = Buffer.from(privateKeyHex, "hex");
  return signPayload(payload, privateKey);
}
