CREATE TABLE "member_levels" (
	"guild_id" varchar(20) NOT NULL,
	"user_id" varchar(20) NOT NULL,
	"xp" integer DEFAULT 0 NOT NULL,
	"level" integer DEFAULT 0 NOT NULL,
	"last_xp_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "member_levels_guild_id_user_id_pk" PRIMARY KEY("guild_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "member_levels" ADD CONSTRAINT "member_levels_guild_id_guilds_id_fk" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "member_levels_guild_xp_idx" ON "member_levels" USING btree ("guild_id","xp");