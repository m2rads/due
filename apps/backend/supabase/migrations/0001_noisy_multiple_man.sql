CREATE TABLE "bank_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"plaid_access_token" text NOT NULL,
	"plaid_item_id" text NOT NULL,
	"institution_id" text NOT NULL,
	"institution_name" text,
	"status" text DEFAULT 'active' NOT NULL,
	"item_status" text DEFAULT 'good' NOT NULL,
	"last_status_update" timestamp with time zone DEFAULT now(),
	"error_code" text,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"deleted_at" timestamp with time zone,
	"delete_reason" text,
	CONSTRAINT "user_institution_unique" UNIQUE("user_id","institution_id")
);
