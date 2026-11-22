-- Custom SQL: Drizzle has no first-class exclusion constraints (ADR 0008).
-- The invariant «no two bookings may overlap» is enforced by the schema, not by
-- a transaction around the scenario (ADR 0004, «Атомарность „проверил → записал"»).
-- `int8range` defaults to the half-open bound `[start, end)`, so a booking that
-- starts exactly when the previous one ends is allowed and partial overlaps,
-- equal starts, and shorter/longer durations are all rejected with 23P01.
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_no_overlapping_slots"
  EXCLUDE USING gist (int8range("start_ms", "end_ms") WITH &&);
