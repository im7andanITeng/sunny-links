/**
 * Phone-build stand-in for @tanstack/react-start. The static Capacitor bundle
 * only needs useServerFn (for the cheat assistant, which is stubbed too), so
 * this passes the function through untouched and avoids pulling the whole
 * server framework into the phone app.
 */
export function useServerFn<T>(fn: T): T {
  return fn;
}
