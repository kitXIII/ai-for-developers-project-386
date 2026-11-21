// The shared short-text rule: 1–100 characters, not all spaces, no edge
// spaces. Fields that use it keep their own catalog key at the throw site
// (ADR 0004, ADR 0007): a kind is shared, a wording names the field. The limits
// are exported so the message can quote the same numbers the predicate checks.
export const SHORT_TEXT_MIN = 1;
export const SHORT_TEXT_MAX = 100;

const shortTextPattern = /^\S(?:.*\S)?$/;

export function isShortText(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length >= SHORT_TEXT_MIN &&
    value.length <= SHORT_TEXT_MAX &&
    shortTextPattern.test(value)
  );
}
