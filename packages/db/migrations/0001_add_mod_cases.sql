CREATE TYPE "public"."mod_case_type" AS ENUM('ban', 'kick', 'timeout', 'warn', 'purge');--> statement-breakpoint
CREATE TABLE "mod_cases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guild_id" varchar(20) NOT NULL,
	"case_number" integer NOT NULL,
	"type" "mod_case_type" NOT NULL,
	"target_id" varchar(20),
	"moderator_id" varchar(20) NOT NULL,
	"reason" text NOT NULL,
	"duration_seconds" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mod_cases_guild_case_number_unique" UNIQUE("guild_id","case_number")
);
--> statement-breakpoint
ALTER TABLE "mod_cases" ADD CONSTRAINT "mod_cases_guild_id_guilds_id_fk" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "mod_cases_guild_target_idx" ON "mod_cases" USING btree ("guild_id","target_id","created_at");