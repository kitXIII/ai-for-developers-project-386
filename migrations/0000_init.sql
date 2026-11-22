CREATE TABLE "bookings" (
	"seq" bigint GENERATED ALWAYS AS IDENTITY (sequence name "bookings_seq_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meeting_type_id" uuid NOT NULL,
	"meeting_type_name" text NOT NULL,
	"guest_name" text NOT NULL,
	"start_ms" bigint NOT NULL,
	"end_ms" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meeting_types" (
	"seq" bigint GENERATED ALWAYS AS IDENTITY (sequence name "meeting_types_seq_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"duration_minutes" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_meeting_type_id_meeting_types_id_fk" FOREIGN KEY ("meeting_type_id") REFERENCES "public"."meeting_types"("id") ON DELETE no action ON UPDATE no action;