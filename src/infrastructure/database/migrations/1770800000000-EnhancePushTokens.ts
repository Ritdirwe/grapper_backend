import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnhancePushTokens1770800000000 implements MigrationInterface {
  name = 'EnhancePushTokens1770800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "push_tokens" ADD COLUMN IF NOT EXISTS "last_used_at" TIMESTAMP`);
    await queryRunner.query(`ALTER TABLE "push_tokens" ADD COLUMN IF NOT EXISTS "last_error" text`);
    await queryRunner.query(`ALTER TABLE "push_tokens" ADD COLUMN IF NOT EXISTS "failure_count" integer NOT NULL DEFAULT 0`);

    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_869b4a9ba2c9e030aafc4b7dc7"`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_push_tokens_token_unique" ON "push_tokens" ("token")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_push_tokens_user_active" ON "push_tokens" ("user_id", "active")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_push_tokens_platform_active" ON "push_tokens" ("platform", "active")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_push_tokens_platform_active"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_push_tokens_user_active"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_push_tokens_token_unique"`);

    await queryRunner.query(`CREATE INDEX "IDX_869b4a9ba2c9e030aafc4b7dc7" ON "push_tokens" ("token")`);
    await queryRunner.query(`ALTER TABLE "push_tokens" DROP COLUMN IF EXISTS "failure_count"`);
    await queryRunner.query(`ALTER TABLE "push_tokens" DROP COLUMN IF EXISTS "last_error"`);
    await queryRunner.query(`ALTER TABLE "push_tokens" DROP COLUMN IF EXISTS "last_used_at"`);
  }
}
