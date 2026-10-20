import { cacheKey } from "./cache";
type Flight<T> = {
  promise: Promise<T>;
  controller: AbortController;
  users: number;
};
const flights = new Map<string, Flight<unknown>>();
/** Coalesce concurrent identical calls; cancel upstream when every subscriber leaves. */
export async function dedupeCall<T>(
  input: unknown,
  signal: AbortSignal | undefined,
  run: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  signal?.throwIfAborted();
  const key = cacheKey(input);
  let flight = flights.get(key) as Flight<T> | undefined;
  if (!flight) {
    const controller = new AbortController();
    const promise = Promise.resolve().then(() => run(controller.signal));
    flight = { promise, controller, users: 0 };
    flights.set(key, flight);
    const created = flight;
    void promise
      .finally(() => {
        if (flights.get(key) === created) flights.delete(key);
      })
      .catch(() => {});
  }
  flight.users++;
  const shared = flight;
  return new Promise<T>((resolve, reject) => {
    let finished = false;
    const done = () => {
      if (finished) return false;
      finished = true;
      signal?.removeEventListener("abort", onAbort);
      shared.users--;
      if (!shared.users) {
        shared.controller.abort();
        if (flights.get(key) === shared) flights.delete(key);
      }
      return true;
    };
    const onAbort = () => {
      if (done()) reject(signal?.reason || new Error("Request cancelled"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
    shared.promise.then(
      (value) => {
        if (done()) resolve(value);
      },
      (error) => {
        if (done()) reject(error);
      },
    );
  });
}
