import { VworldApiError } from './errors';

export const REQUEST_TIMEOUT_MS = 12_000;

/** Limit both response headers and body parsing; never expose URLs containing keys. */
export async function fetchJson(url: string, signal?: AbortSignal, timeoutMs = REQUEST_TIMEOUT_MS): Promise<unknown> {
  const controller = new AbortController();
  let timedOut = false;
  let rejectAbort: (error: VworldApiError) => void = () => {};
  const aborted = new Promise<never>((_, reject) => { rejectAbort = reject; });
  const cancel = () => {
    controller.abort();
    rejectAbort(new VworldApiError(timedOut ? 'TIMEOUT' : 'CANCELLED',
      timedOut ? '응답이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.' : '조회가 취소되었습니다.', null));
  };
  signal?.addEventListener('abort', cancel, { once: true });
  const timer = setTimeout(() => { timedOut = true; cancel(); }, timeoutMs);
  try {
    if (signal?.aborted) cancel();
    const request = (async () => {
      if (controller.signal.aborted) throw new VworldApiError('CANCELLED', '조회가 취소되었습니다.', null);
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) {
        throw new VworldApiError(response.status === 429 ? 'RATE_LIMIT' : 'NETWORK',
          response.status === 429 ? '조회 요청이 많습니다. 잠시 후 다시 시도해 주세요.' : `서버 응답 오류 (HTTP ${response.status})`, null);
      }
      try { return await response.json(); }
      catch {
        if (controller.signal.aborted) throw new VworldApiError(timedOut ? 'TIMEOUT' : 'CANCELLED', '조회가 중단되었습니다.', null);
        throw new VworldApiError('SCHEMA', '응답 형식을 확인할 수 없습니다. 소유구분을 판단하지 않습니다.', null);
      }
    })();
    return await Promise.race([request, aborted]);
  } catch (error) {
    if (error instanceof VworldApiError) throw error;
    throw new VworldApiError('NETWORK', '네트워크 연결을 확인한 뒤 다시 시도해 주세요.', null);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', cancel);
  }
}
