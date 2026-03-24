import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPayoutReleasesAndFlutterwaveProvider1770500000000
  implements MigrationInterface
{
  name = 'AddPayoutReleasesAndFlutterwaveProvider1770500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."payout_methods_provider_enum" ADD VALUE IF NOT EXISTS 'flutterwave'`,
    );

    await queryRunner.query(
      `ALTER TABLE "payout_methods" ADD COLUMN IF NOT EXISTS "flutterwave_recipient_id" character varying`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "payout_releases" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "provider_id" uuid NOT NULL,
        "source_type" character varying(32) NOT NULL,
        "source_id" uuid NOT NULL,
        "release_mode" character varying(32) NOT NULL,
        "milestone_id" uuid,
        "amount" numeric(12,2) NOT NULL,
        "currency" character varying NOT NULL DEFAULT 'NGN',
        "progress_percent" numeric(5,2),
        "reason" text,
        "released_by" uuid NOT NULL,
        "metadata" jsonb,
        CONSTRAINT "PK_payout_releases_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_payout_releases_provider" FOREIGN KEY ("provider_id") REFERENCES "users"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_payout_releases_released_by" FOREIGN KEY ("released_by") REFERENCES "users"("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_payout_releases_provider" ON "payout_releases" ("provider_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_payout_releases_source" ON "payout_releases" ("source_type", "source_id")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_payout_releases_source_milestone" ON "payout_releases" ("source_type", "source_id", "milestone_id") WHERE "milestone_id" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_payout_releases_source_milestone"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_payout_releases_source"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_payout_releases_provider"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "payout_releases"`);
    await queryRunner.query(
      `ALTER TABLE "payout_methods" DROP COLUMN IF EXISTS "flutterwave_recipient_id"`,
    );
  }
}
