import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAdminPenaltySettingsAndPayoutBreakdown1780000000000 implements MigrationInterface {
  name = 'AddAdminPenaltySettingsAndPayoutBreakdown1780000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DO $$ BEGIN CREATE TYPE "public"."admin_penalty_settings_provider_rejection_penalty_mode_enum" AS ENUM('once_per_rejection', 'once_per_milestone'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);

    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "admin_penalty_settings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "customer_correction_enabled" boolean NOT NULL DEFAULT true, "customer_correction_free_limit" integer NOT NULL DEFAULT 3, "customer_correction_flat_penalty" numeric(12,2) NOT NULL DEFAULT 0, "customer_correction_percent_penalty" numeric(5,2) NOT NULL DEFAULT 0, "provider_evidence_enabled" boolean NOT NULL DEFAULT true, "provider_evidence_free_limit" integer NOT NULL DEFAULT 3, "provider_evidence_flat_penalty" numeric(12,2) NOT NULL DEFAULT 0, "provider_evidence_percent_penalty" numeric(5,2) NOT NULL DEFAULT 0, "provider_rejection_enabled" boolean NOT NULL DEFAULT true, "provider_rejection_flat_penalty" numeric(12,2) NOT NULL DEFAULT 0, "provider_rejection_percent_penalty" numeric(5,2) NOT NULL DEFAULT 0, "provider_rejection_penalty_mode" "public"."admin_penalty_settings_provider_rejection_penalty_mode_enum" NOT NULL DEFAULT 'once_per_rejection', CONSTRAINT "PK_admin_penalty_settings_id" PRIMARY KEY ("id"))`,
    );

    await queryRunner.query(
      `INSERT INTO "admin_penalty_settings" ("customer_correction_enabled", "customer_correction_free_limit", "customer_correction_flat_penalty", "customer_correction_percent_penalty", "provider_evidence_enabled", "provider_evidence_free_limit", "provider_evidence_flat_penalty", "provider_evidence_percent_penalty", "provider_rejection_enabled", "provider_rejection_flat_penalty", "provider_rejection_percent_penalty", "provider_rejection_penalty_mode") SELECT true, 3, 0, 0, true, 3, 0, 0, true, 0, 0, 'once_per_rejection' WHERE NOT EXISTS (SELECT 1 FROM "admin_penalty_settings")`,
    );

    await queryRunner.query(`ALTER TABLE "payout_releases" ADD COLUMN IF NOT EXISTS "gross_amount" numeric(12,2)`);
    await queryRunner.query(`ALTER TABLE "payout_releases" ADD COLUMN IF NOT EXISTS "penalty_amount" numeric(12,2)`);
    await queryRunner.query(`ALTER TABLE "payout_releases" ADD COLUMN IF NOT EXISTS "penalty_reason" text`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "payout_releases" DROP COLUMN IF EXISTS "penalty_reason"`);
    await queryRunner.query(`ALTER TABLE "payout_releases" DROP COLUMN IF EXISTS "penalty_amount"`);
    await queryRunner.query(`ALTER TABLE "payout_releases" DROP COLUMN IF EXISTS "gross_amount"`);

    await queryRunner.query(`DROP TABLE "admin_penalty_settings"`);
    await queryRunner.query(`DROP TYPE "public"."admin_penalty_settings_provider_rejection_penalty_mode_enum"`);
  }
}
