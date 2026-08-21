import { createAuthClient } from "better-auth/react";
import { env } from "@/env";

function getAuthBaseUrl(): string | undefined {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return env.NEXT_PUBLIC_APP_URL;
}

export const authClient = createAuthClient({
  baseURL: getAuthBaseUrl(),
});
