import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWaitlistEntries1780100000000 implements MigrationInterface {
  name = 'CreateWaitlistEntries1780100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        CREATE TYPE "public"."waitlist_entries_role_enum" AS ENUM('user', 'provider');
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        CREATE TYPE "public"."waitlist_entries_gender_enum" AS ENUM('male', 'female', 'other', 'prefer_not_to_say');
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        CREATE TYPE "public"."waitlist_entries_verification_status_enum" AS ENUM('unverified', 'pending', 'verified', 'rejected');
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "waitlist_entries" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "email" character varying NOT NULL,
        "phone_number" character varying,
        "role" "public"."waitlist_entries_role_enum" NOT NULL,
        "password_hash" character varying NOT NULL,
        "full_name" character varying,
        "display_name" character varying,
        "bio" text,
        "avatar_url" character varying,
        "cover_image_url" character varying,
        "birthdate" date,
        "gender" "public"."waitlist_entries_gender_enum",
        "location" character varying,
        "country" character varying,
        "city" character varying,
        "website" character varying,
        "university" character varying,
        "social_links" jsonb,
        "verification_status" "public"."waitlist_entries_verification_status_enum" NOT NULL DEFAULT 'unverified',
        "verification_document_url" character varying,
        "business_name" character varying,
        "description" text,
        "skills" jsonb,
        "certifications" jsonb,
        "years_of_experience" integer,
        "portfolio" jsonb,
        "hourly_rate" numeric(10,2),
        "currency" character varying,
        "response_time_hours" integer,
        "completion_rate" numeric(5,2) NOT NULL DEFAULT 0,
        "total_earnings" numeric(12,2) NOT NULL DEFAULT 0,
        "total_jobs" integer NOT NULL DEFAULT 0,
        "average_rating" numeric(3,2) NOT NULL DEFAULT 0,
        "total_reviews" integer NOT NULL DEFAULT 0,
        "is_available" boolean NOT NULL DEFAULT true,
        "availability_hours" jsonb,
        "last_active_at" TIMESTAMP,
        "stripe_account_id" character varying,
        "stripe_onboarding_complete" boolean NOT NULL DEFAULT false,
        "paystack_subaccount_code" character varying,
        "is_promoted" boolean NOT NULL DEFAULT false,
        "promoted_user_id" character varying,
        "promoted_at" TIMESTAMP,
        CONSTRAINT "PK_waitlist_entries_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_waitlist_entries_email" ON "waitlist_entries" ("email")
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_waitlist_entries_phone_number" ON "waitlist_entries" ("phone_number")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_waitlist_entries_role" ON "waitlist_entries" ("role")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_waitlist_entries_is_promoted" ON "waitlist_entries" ("is_promoted")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_waitlist_entries_is_promoted"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_waitlist_entries_role"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_waitlist_entries_phone_number"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_waitlist_entries_email"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "waitlist_entries"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."waitlist_entries_verification_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."waitlist_entries_gender_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."waitlist_entries_role_enum"`);
  }
}
