import { RequestThrottler } from "./jira-request-throttler";

describe('Constructor', () => {
  it('creates instance with default interval if no interval set', () => {
    const throttler = new RequestThrottler();

    expect(throttler.minIntervalMs).toBe(1100);
  });

  it('creates instance with interval if interval is set', () => {
    const throttler = new RequestThrottler(100);

    expect(throttler.minIntervalMs).toBe(100);
  });
});

describe('Throttle behavior', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('does not wait on first request', async () => {
    const throttler = new RequestThrottler(100);

    await throttler.throttle();

    expect(jest.getTimerCount()).toBe(0);
  });

  it('throttles correctly when called before min interval elapsed', async () => {
    const throttler = new RequestThrottler(100);

    await throttler.throttle();
    jest.advanceTimersByTime(50);
    const throttlePromise = throttler.throttle();
    expect(jest.getTimerCount()).toBeGreaterThan(0);

    jest.advanceTimersByTime(50);
    await throttlePromise;

    expect(jest.getTimerCount()).toBe(0);
  });
});