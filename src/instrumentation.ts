/** Runs once when the server starts. */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.DISABLE_BACKUP_SCHEDULER !== "1") {
    const { startScheduler } = await import("./lib/scheduler");
    startScheduler();
  }
}
