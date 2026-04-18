import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserMustResetPassword1771000000000 implements MigrationInterface {
  name = 'AddUserMustResetPassword1771000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "must_reset_password" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "must_reset_password"`);
  }
}
