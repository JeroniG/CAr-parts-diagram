/** Bounded fetches. Retry only transient responses; caller cancellation remains authoritative. */
export async function fetchBytes(
  url: string,
  signal?: AbortSignal,
  maxBytes = 10 * 1024 * 1024,
): Promise<Uint8Array<ArrayBuffer>> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const timeout = AbortSignal.timeout(12000),
      combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
    const response = await fetch(url, { signal: combined, credentials: 'same-origin' });
    if ((response.status === 429 || response.status === 503) && attempt === 0) {
      const delay = Math.min(
        2000,
        Math.max(100, Number(response.headers.get('retry-after') ?? '.2') * 1000 || 200),
      );
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(done, delay);
        function done() {
          signal?.removeEventListener('abort', abort);
          resolve();
        }
        function abort() {
          clearTimeout(timer);
          reject(new DOMException('Canceled', 'AbortError'));
        }
        signal?.addEventListener('abort', abort, { once: true });
        if (signal?.aborted) abort();
      });
      continue;
    }
    if (!response.ok) throw Error(`Provider unavailable (HTTP ${response.status}).`);
    if (Number(response.headers.get('content-length')) > maxBytes)
      throw Error('Provider response exceeds its size budget.');
    const reader = response.body?.getReader();
    if (!reader) {
      const b = new Uint8Array(await response.arrayBuffer());
      if (b.length > maxBytes) throw Error('Response too large.');
      return b;
    }
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > maxBytes) {
        await reader.cancel();
        throw Error('Response too large.');
      }
      chunks.push(value);
    }
    const result = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    return result;
  }
  throw Error('Provider unavailable.');
}
export const sha256 = async (bytes: Uint8Array<ArrayBuffer>) =>
  Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)))
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('');
export const decodeJSON = (bytes: Uint8Array) =>
  JSON.parse(new TextDecoder().decode(bytes)) as unknown;
