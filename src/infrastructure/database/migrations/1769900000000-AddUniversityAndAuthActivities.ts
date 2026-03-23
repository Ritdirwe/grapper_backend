import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUniversityAndAuthActivities1769900000000 implements MigrationInterface {
  name = 'AddUniversityAndAuthActivities1769900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "profiles" ADD "university" character varying`);

    await queryRunner.query(
      `CREATE TYPE "public"."auth_activities_action_enum" AS ENUM(
        'register',
        'login_success',
        'login_failed',
        'refresh_success',
        'refresh_failed',
        'logout',
        'verify_email',
        'verify_email_failed',
        'resend_verification_email',
        'password_reset_request',
        'password_reset_success',
        'password_reset_failed'
      )`,
    );

    await queryRunner.query(
      `CREATE TABLE "auth_activities" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "user_id" uuid,
        "action" "public"."auth_activities_action_enum" NOT NULL,
        "email" character varying,
        "ip_address" character varying,
        "user_agent" character varying,
        "metadata" jsonb,
        CONSTRAINT "PK_auth_activities_id" PRIMARY KEY ("id")
      )`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_auth_activities_user_id" ON "auth_activities" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_auth_activities_action" ON "auth_activities" ("action")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_auth_activities_created_at" ON "auth_activities" ("created_at")`,
    );

    await queryRunner.query(
      `ALTER TABLE "auth_activities" ADD CONSTRAINT "FK_auth_activities_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "auth_activities" DROP CONSTRAINT "FK_auth_activities_user"`);

    await queryRunner.query(`DROP INDEX "public"."IDX_auth_activities_created_at"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_auth_activities_action"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_auth_activities_user_id"`);

    await queryRunner.query(`DROP TABLE "auth_activities"`);
    await queryRunner.query(`DROP TYPE "public"."auth_activities_action_enum"`);

    await queryRunner.query(`ALTER TABLE "profiles" DROP COLUMN "university"`);
  }
}
