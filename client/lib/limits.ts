// The form limits come from the contract (`packages/api/spec/main.tsp`) and are
// repeated on the client because the SPA validates before sending a request.
// The generated Zod schema (`packages/api/generated/client/zod.gen.ts`) is the
// source of truth: `test/client/limits.test.ts` pins these numbers to it, and
// catalog phrases take them as `{min}`/`{max}` parameters so text and rule
// cannot drift apart.
export const SHORT_TEXT_MIN = 1;
export const SHORT_TEXT_MAX = 100;
export const DESCRIPTION_MAX = 1000;
export const DURATION_MIN = 5;
export const DURATION_MAX = 540;
