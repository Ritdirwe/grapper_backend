import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserSessionVersion1770400000000 implements MigrationInterface {
  name = 'AddUserSessionVersion1770400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "session_version" integer NOT NULL DEFAULT 1`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "session_version"`,
    );
  }
}
