"use client";

import { createContext, useContext } from "react";

type AuthBrand = { wordmark?: string; abbr?: string };

const AuthBrandContext = createContext<AuthBrand>({});

export function AuthBrandProvider({
  wordmark,
  abbr,
  children,
}: AuthBrand & { children: React.ReactNode }) {
  return (
    <AuthBrandContext.Provider value={{ wordmark, abbr }}>{children}</AuthBrandContext.Provider>
  );
}

export function useAuthBrand(): AuthBrand {
  return useContext(AuthBrandContext);
}
