import type { TourEndpoint } from './tour-types';

export class TourApiError extends Error {
  constructor(readonly code: string, readonly endpoint?: TourEndpoint) {
    // Provider bodies and request URLs may contain credentials.
    super(`TourAPI ${code}${endpoint ? ` (${endpoint})` : ''}`);
  }
}
export class MappingError extends Error {}
export class TourStoreError extends Error {
  constructor(readonly code: string) { super(`Tour ingestion database error (${code})`); }
}
