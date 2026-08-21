export const LAB_DEMO_ORIGIN = "https://demo.rihla.my.id";

export function hostnameFromHostHeader(hostHeader: string | null | undefined): string {
  if (!hostHeader) return "";
  return hostHeader.split(",")[0]?.trim().split(":")[0]?.toLowerCase() ?? "";
}

export function isProductHostname(hostname: string): boolean {
  return hostname === "rihla.my.id" || hostname === "www.rihla.my.id";
}

export function staffSignInHrefForHost(hostname: string): string {
  if (isProductHostname(hostname)) {
    return `${LAB_DEMO_ORIGIN}/sign-in`;
  }
  return "/sign-in";
}
