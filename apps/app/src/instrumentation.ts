export function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // TODO: Start license check-in scheduler — call scheduleCheckIn() from @/lib/license/checkin with the active license key
    console.log("[Instrumentation] Server starting...");
  }
}
