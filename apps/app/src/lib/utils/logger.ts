type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
  error?: string;
}

function getTimestamp(): string {
  return new Date().toISOString();
}

function shouldLog(level: LogLevel): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  return level === "warn" || level === "error";
}

function formatError(err: unknown): string | undefined {
  if (err instanceof Error) return err.stack ?? err.message;
  if (typeof err === "string") return err;
  return undefined;
}

function write(entry: LogEntry): void {
  const { level, message, timestamp, context, error } = entry;

  switch (level) {
    case "error":
      console.error(JSON.stringify({ level, message, timestamp, context, error }));
      break;
    case "warn":
      console.warn(JSON.stringify({ level, message, timestamp, context }));
      break;
    case "info":
      console.info(JSON.stringify({ level, message, timestamp, context }));
      break;
    case "debug":
      console.debug(JSON.stringify({ level, message, timestamp, context }));
      break;
  }
}

export const logger = {
  debug(message: string, context?: Record<string, unknown>): void {
    if (!shouldLog("debug")) return;
    write({ level: "debug", message, timestamp: getTimestamp(), context });
  },

  info(message: string, context?: Record<string, unknown>): void {
    if (!shouldLog("info")) return;
    write({ level: "info", message, timestamp: getTimestamp(), context });
  },

  warn(message: string, context?: Record<string, unknown>, error?: unknown): void {
    write({
      level: "warn",
      message,
      timestamp: getTimestamp(),
      context,
      error: error ? formatError(error) : undefined,
    });
  },

  error(message: string, context?: Record<string, unknown>, error?: unknown): void {
    write({
      level: "error",
      message,
      timestamp: getTimestamp(),
      context,
      error: error ? formatError(error) : undefined,
    });
  },
};
