export interface CoverageRequest {
  id: string;
  query: string;
  createdAt: string;
  missing: string[];
  status: 'saved-locally';
}
const key = 'autoatlas-coverage-requests-v1';
export function readCoverageRequests(): CoverageRequest[] {
  try {
    const v = JSON.parse(localStorage.getItem(key) ?? '[]');
    return Array.isArray(v)
      ? v
          .filter(
            (r): r is CoverageRequest =>
              !!r &&
              typeof r.id === 'string' &&
              typeof r.query === 'string' &&
              typeof r.createdAt === 'string' &&
              r.status === 'saved-locally' &&
              Array.isArray(r.missing) &&
              r.missing.every((m: unknown) => typeof m === 'string'),
          )
          .slice(-50)
      : [];
  } catch {
    return [];
  }
}
export function saveCoverageRequest(query: string, missing: string[]) {
  const safeQuery = /^[A-HJ-NPR-Z0-9]{17}$/i.test(query.trim())
    ? `VIN ending ${query.trim().slice(-4)}`
    : query.trim().slice(0, 180);
  const entries = readCoverageRequests(),
    existing = entries.find(
      (r) =>
        r.query.toLowerCase() === safeQuery.toLowerCase() && r.missing.join() === missing.join(),
    );
  if (existing) return existing;
  const request: CoverageRequest = {
    id: crypto.randomUUID(),
    query: safeQuery,
    createdAt: new Date().toISOString(),
    missing,
    status: 'saved-locally',
  };
  localStorage.setItem(key, JSON.stringify([...entries, request].slice(-50)));
  return request;
}
export function exportCoverageRequests() {
  const blob = new Blob([JSON.stringify(readCoverageRequests(), null, 2)], {
      type: 'application/json',
    }),
    url = URL.createObjectURL(blob),
    a = document.createElement('a');
  a.href = url;
  a.download = 'autoatlas-coverage-requests.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
