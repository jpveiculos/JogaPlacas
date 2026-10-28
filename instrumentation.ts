/**
 * Starts the round scheduler inside the long-running Node.js web service.
 *
 * Railway cron jobs have a minimum interval of five minutes, which is too coarse
 * for minute-level opening, cutoff, and draw times. This process invokes the
 * protected scheduler endpoint every 15 seconds while explicitly enabled.
 */
const SCHEDULER_INTERVAL_MS = 15_000;

type SchedulerRuntime = typeof globalThis & {
  __jogaPlacasSchedulerStarted?: boolean;
};

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.ROUND_SCHEDULER_ENABLED !== "true") return;
  if (!process.env.ROUND_SCHEDULER_SECRET) {
    console.error("[round-scheduler] Enabled but ROUND_SCHEDULER_SECRET is missing.");
    return;
  }

  const runtime = globalThis as SchedulerRuntime;
  if (runtime.__jogaPlacasSchedulerStarted) return;
  runtime.__jogaPlacasSchedulerStarted = true;

  let running = false;
  const runScheduler = async () => {
    if (running) return;
    running = true;
    try {
      const [{ POST }, { NextRequest }] = await Promise.all([
        import("./src/app/api/internal/round-scheduler/route"),
        import("next/server"),
      ]);
      const request = new NextRequest("http://round-scheduler.internal/api/internal/round-scheduler", {
        method: "POST",
        headers: { authorization: `Bearer ${process.env.ROUND_SCHEDULER_SECRET}` },
      });
      const response = await POST(request);
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        console.error("[round-scheduler] Run failed.", { status: response.status, payload });
      } else if (payload?.created || payload?.closed || payload?.drawn || payload?.failures) {
        console.info("[round-scheduler] Run completed.", payload);
      }
    } catch (error) {
      console.error("[round-scheduler] Invocation failed.", error);
    } finally {
      running = false;
    }
  };

  console.info("[round-scheduler] Automatic round scheduling enabled; checking every 15 seconds.");
  const firstRun = setTimeout(() => void runScheduler(), 3_000);
  firstRun.unref?.();
  const interval = setInterval(() => void runScheduler(), SCHEDULER_INTERVAL_MS);
  interval.unref?.();
}
