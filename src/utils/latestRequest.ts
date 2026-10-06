/** Generation + abort guard: even transports that ignore abort cannot publish stale results. */
export function createLatestRequest() {
  let generation = 0;
  let controller: AbortController | null = null;
  const cancel = () => {
    generation += 1;
    controller?.abort();
    controller = null;
  };
  return {
    cancel,
    start() {
      cancel();
      const id = generation;
      const current = new AbortController();
      controller = current;
      return { signal: current.signal, isCurrent: () => id === generation && !current.signal.aborted };
    },
  };
}
