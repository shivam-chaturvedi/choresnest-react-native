export type RetryCycleConfig = {
  /**
   * Called when the task finally succeeds.
   */
  onSuccess?: () => void;
  /**
   * Called when an attempt fails before the next delay is scheduled.
   */
  onAttempt?: (attemptNumber: number, error: unknown) => void;
  /**
   * Called once the attempt limit is reached and the cooldown timer starts.
   */
  onCooldown?: () => void;
  /**
   * Maximum number of attempts per cycle before the cooldown fires.
   * Defaults to 10.
   */
  attemptLimit?: number;
  /**
   * Milliseconds to wait between attempts in the same cycle.
   * Defaults to 3_000.
   */
  attemptDelayMs?: number;
  /**
   * Milliseconds to wait once the cycle exhausts before restarting the next cycle.
   * Defaults to 60_000.
   */
  cooldownMs?: number;
};

export class CyclicRetryController {
  private attemptCount = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private stopped = true;

  constructor(
    private readonly task: () => Promise<void>,
    private readonly config: RetryCycleConfig = {}
  ) {}

  /**
   * Starts the retry cycle. Multiple calls while `running` do nothing.
   */
  start() {
    if (!this.stopped) {
      return;
    }
    this.stopped = false;
    this.attemptCount = 0;
    this.executeAttempt();
  }

  /**
   * Stops any pending timers/cycles and prevents further attempts.
   */
  stop() {
    this.stopped = true;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private executeAttempt() {
    if (this.stopped) {
      return;
    }
    this.attemptCount += 1;

    this.task()
      .then(() => {
        this.config.onSuccess?.();
        this.stop();
      })
      .catch(error => {
        const attemptLimit = this.config.attemptLimit ?? 10;
        const attemptDelayMs = this.config.attemptDelayMs ?? 3000;
        const cooldownMs = this.config.cooldownMs ?? 60000;

        this.config.onAttempt?.(this.attemptCount, error);

        if (this.attemptCount >= attemptLimit) {
          this.config.onCooldown?.();
          this.attemptCount = 0;
          this.scheduleNext(cooldownMs);
          return;
        }

        this.scheduleNext(attemptDelayMs);
      });
  }

  private scheduleNext(delayMs: number) {
    if (this.stopped) {
      return;
    }
    if (this.timer) {
      clearTimeout(this.timer);
    }
    this.timer = setTimeout(() => this.executeAttempt(), delayMs);
  }
}

export const createCyclicRetry = (
  task: () => Promise<void>,
  config: RetryCycleConfig = {}
) => new CyclicRetryController(task, config);

/**
 * Example:
 *
 * const retryController = createCyclicRetry(async () => {
 *   await realtimeService.connect(); // your subscription/connection logic
 * }, {
 *   attemptLimit: 10,
 *   attemptDelayMs: 3_000,
 *   cooldownMs: 60_000,
 *   onAttempt: (attempt, err) => console.log(`Attempt ${attempt} failed`, err),
 *   onCooldown: () => console.log('Cooldown started after 10 attempts'),
 *   onSuccess: () => console.log('Realtime connection established'),
 * });
 *
 * useEffect(() => {
 *   retryController.start();
 *   return () => retryController.stop(); // cleanup timers on unmount
 * }, []);
 */
