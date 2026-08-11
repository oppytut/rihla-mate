let kind: "invite" | "reset" = "reset";

export function getPasswordEmailKind(): "invite" | "reset" {
  return kind;
}

export async function withPasswordEmailKind<T>(
  next: "invite" | "reset",
  fn: () => Promise<T>,
): Promise<T> {
  const prev = kind;
  kind = next;
  try {
    return await fn();
  } finally {
    kind = prev;
  }
}
