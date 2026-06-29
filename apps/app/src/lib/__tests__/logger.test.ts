import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { logger } from "../utils/logger";

describe("logger", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("log levels", () => {
    it('logger.debug() creates a log entry with level "debug"', () => {
      const spy = vi.spyOn(console, "debug").mockImplementation(() => {});
      logger.debug("test message");

      expect(spy).toHaveBeenCalledTimes(1);
      const entry = JSON.parse(spy.mock.calls[0][0]);
      expect(entry.level).toBe("debug");
      expect(entry.message).toBe("test message");
    });

    it('logger.info() creates a log entry with level "info"', () => {
      const spy = vi.spyOn(console, "info").mockImplementation(() => {});
      logger.info("test message");

      expect(spy).toHaveBeenCalledTimes(1);
      const entry = JSON.parse(spy.mock.calls[0][0]);
      expect(entry.level).toBe("info");
      expect(entry.message).toBe("test message");
    });

    it('logger.warn() creates a log entry with level "warn"', () => {
      const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
      logger.warn("test message");

      expect(spy).toHaveBeenCalledTimes(1);
      const entry = JSON.parse(spy.mock.calls[0][0]);
      expect(entry.level).toBe("warn");
      expect(entry.message).toBe("test message");
    });

    it('logger.error() creates a log entry with level "error"', () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      logger.error("test message");

      expect(spy).toHaveBeenCalledTimes(1);
      const entry = JSON.parse(spy.mock.calls[0][0]);
      expect(entry.level).toBe("error");
      expect(entry.message).toBe("test message");
    });
  });

  describe("message preservation", () => {
    it("message is preserved in the output", () => {
      const spy = vi.spyOn(console, "info").mockImplementation(() => {});
      const msg = "User booking #1234 has been created";
      logger.info(msg);

      const entry = JSON.parse(spy.mock.calls[0][0]);
      expect(entry.message).toBe(msg);
    });
  });

  describe("timestamp", () => {
    it("timestamp is ISO 8601 format", () => {
      const spy = vi.spyOn(console, "info").mockImplementation(() => {});
      logger.info("test message");

      const entry = JSON.parse(spy.mock.calls[0][0]);
      expect(entry.timestamp).toBeDefined();
      expect(() => new Date(entry.timestamp)).not.toThrow();
      expect(new Date(entry.timestamp).toISOString()).toBe(entry.timestamp);
    });
  });

  describe("context", () => {
    it("context object is included in the log entry", () => {
      const spy = vi.spyOn(console, "info").mockImplementation(() => {});
      const context = { userId: "abc-123", action: "create" };
      logger.info("test message", context);

      const entry = JSON.parse(spy.mock.calls[0][0]);
      expect(entry.context).toEqual(context);
    });

    it("context is undefined when not provided", () => {
      const spy = vi.spyOn(console, "info").mockImplementation(() => {});
      logger.info("test message");

      const entry = JSON.parse(spy.mock.calls[0][0]);
      expect(entry.context).toBeUndefined();
    });
  });

  describe("error handling", () => {
    it("error method includes stack trace when Error object is passed", () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      const err = new Error("Something went wrong");
      logger.error("test message", undefined, err);

      const entry = JSON.parse(spy.mock.calls[0][0]);
      expect(entry.error).toBeDefined();
      expect(entry.error).toContain("Error: Something went wrong");
      expect(entry.error).toContain("at ");
    });

    it("error method includes error string when string is passed", () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      logger.error("test message", undefined, "string error");

      const entry = JSON.parse(spy.mock.calls[0][0]);
      expect(entry.error).toBe("string error");
    });

    it("error method does not include error field when no error is passed", () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      logger.error("test message");

      const entry = JSON.parse(spy.mock.calls[0][0]);
      expect(entry.error).toBeUndefined();
    });

    it("warn method does not include error in output (write omits error for warn)", () => {
      const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const err = new Error("warning error");
      logger.warn("test message", undefined, err);

      const entry = JSON.parse(spy.mock.calls[0][0]);
      expect(entry.error).toBeUndefined();
    });
  });

  describe("production mode suppression", () => {
    beforeEach(() => {
      vi.stubEnv("NODE_ENV", "production");
    });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it("debug level is suppressed in production", () => {
      const spy = vi.spyOn(console, "debug").mockImplementation(() => {});
      logger.debug("should not appear");
      expect(spy).not.toHaveBeenCalled();
    });

    it("info level is suppressed in production", () => {
      const spy = vi.spyOn(console, "info").mockImplementation(() => {});
      logger.info("should not appear");
      expect(spy).not.toHaveBeenCalled();
    });

    it("warn level is logged in production", () => {
      const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
      logger.warn("should appear");
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it("error level is logged in production", () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      logger.error("should appear");
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe("non-production mode", () => {
    beforeEach(() => {
      vi.stubEnv("NODE_ENV", "development");
    });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it("debug level is logged in non-production", () => {
      const spy = vi.spyOn(console, "debug").mockImplementation(() => {});
      logger.debug("should appear");
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it("info level is logged in non-production", () => {
      const spy = vi.spyOn(console, "info").mockImplementation(() => {});
      logger.info("should appear");
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it("warn level is logged in non-production", () => {
      const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
      logger.warn("should appear");
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it("error level is logged in non-production", () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      logger.error("should appear");
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });
});
