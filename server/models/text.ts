// The shared short-text rule: 1–100 characters, not all spaces, no edge
// spaces. Fields that use it keep their own messages at the throw site
// (ADR 0004): a kind is shared, a wording names the field.
const shortTextPattern = /^\S(?:.*\S)?$/;

export function isShortText(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length >= 1 &&
    value.length <= 100 &&
    shortTextPattern.test(value)
  );
}
