CREATE TYPE "public"."org_plan" AS ENUM('TRIAL', 'STARTER', 'PRO', 'ENTERPRISE');
-->statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('ACTIVE', 'PAST_DUE', 'CANCELED', 'TRIALING');
-->statement-breakpoint
CREATE TABLE IF NOT EXISTS "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"plan" "org_plan" DEFAULT 'TRIAL' NOT NULL,
	"subscription_status" "subscription_status" DEFAULT 'TRIALING' NOT NULL,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"trial_ends_at" timestamp with time zone,
	"invite_token" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug"),
	CONSTRAINT "organizations_stripe_customer_id_unique" UNIQUE("stripe_customer_id"),
	CONSTRAINT "organizations_stripe_subscription_id_unique" UNIQUE("stripe_subscription_id"),
	CONSTRAINT "organizations_invite_token_unique" UNIQUE("invite_token")
);
-->statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "organization_id" uuid REFERENCES "organizations"("id") ON DELETE cascade;
-->statement-breakpoint
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "organization_id" uuid REFERENCES "organizations"("id") ON DELETE cascade;
-->statement-breakpoint
ALTER TABLE "materials" ADD COLUMN IF NOT EXISTS "organization_id" uuid REFERENCES "organizations"("id") ON DELETE cascade;
-->statement-breakpoint
ALTER TABLE "reports" ADD COLUMN IF NOT EXISTS "organization_id" uuid REFERENCES "organizations"("id") ON DELETE cascade;
-->statement-breakpoint
ALTER TABLE "user_assignments" ADD COLUMN IF NOT EXISTS "organization_id" uuid REFERENCES "organizations"("id") ON DELETE cascade;
-->statement-breakpoint
ALTER TABLE "chat_messages" ADD COLUMN IF NOT EXISTS "organization_id" uuid REFERENCES "organizations"("id") ON DELETE cascade;
-->statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "organization_id" uuid REFERENCES "organizations"("id") ON DELETE cascade;
-->statement-breakpoint
ALTER TABLE "report_attachments" ADD COLUMN IF NOT EXISTS "organization_id" uuid REFERENCES "organizations"("id") ON DELETE cascade;
-->statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_org_id_idx" ON "users" ("organization_id");
-->statement-breakpoint
CREATE INDEX IF NOT EXISTS "projects_org_id_idx" ON "projects" ("organization_id");
-->statement-breakpoint
CREATE INDEX IF NOT EXISTS "materials_org_id_idx" ON "materials" ("organization_id");
-->statement-breakpoint
CREATE INDEX IF NOT EXISTS "reports_org_id_idx" ON "reports" ("organization_id");
-->statement-breakpoint
CREATE INDEX IF NOT EXISTS "ua_org_id_idx" ON "user_assignments" ("organization_id");
-->statement-breakpoint
CREATE INDEX IF NOT EXISTS "cm_org_id_idx" ON "chat_messages" ("organization_id");
-->statement-breakpoint
CREATE INDEX IF NOT EXISTS "notif_org_id_idx" ON "notifications" ("organization_id");
-->statement-breakpoint
CREATE INDEX IF NOT EXISTS "ra_org_id_idx" ON "report_attachments" ("organization_id");
