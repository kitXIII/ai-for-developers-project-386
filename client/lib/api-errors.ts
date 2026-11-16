// React Query surfaces a contract failure as an `Error` carrying the machine
// `code` from the unified `{ code, message }` body. A missing meeting type is
// the final 404 (the queries set `retry: false`) and renders its own text.
export function isMeetingTypeNotFound(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'meeting_type_not_found'
  );
}
