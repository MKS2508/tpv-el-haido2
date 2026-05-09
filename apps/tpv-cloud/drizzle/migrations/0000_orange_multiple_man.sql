CREATE TABLE IF NOT EXISTS "activations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"license_id" uuid NOT NULL,
	"machine_fingerprint" varchar(128) NOT NULL,
	"activated_at" timestamp DEFAULT now() NOT NULL,
	"ip_address" varchar(64)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "licenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key_hash" varchar(128) NOT NULL,
	"email" varchar(255) NOT NULL,
	"machine_fingerprint" varchar(128),
	"license_type" varchar(32) NOT NULL,
	"activated_at" timestamp DEFAULT now(),
	"expires_at" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "licenses_key_hash_unique" UNIQUE("key_hash")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "releases" (
	"version" varchar(32) NOT NULL,
	"target" varchar(32) NOT NULL,
	"arch" varchar(32) NOT NULL,
	"url" varchar(512) NOT NULL,
	"signature" text NOT NULL,
	"pub_date" timestamp DEFAULT now() NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "releases_version_target_arch_pk" PRIMARY KEY("version","target","arch")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "activations" ADD CONSTRAINT "activations_license_id_licenses_id_fk" FOREIGN KEY ("license_id") REFERENCES "public"."licenses"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "licenses_key_hash_idx" ON "licenses" USING btree ("key_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "licenses_email_idx" ON "licenses" USING btree ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "releases_pub_date_idx" ON "releases" USING btree ("pub_date");