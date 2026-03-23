import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVerificationRequests1769000000000 implements MigrationInterface {
  name = 'AddVerificationRequests1769000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "verification_requests" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "user_id" uuid NOT NULL, "profile_id" uuid NOT NULL, "status" character varying(20) NOT NULL DEFAULT 'pending', "credential_type" character varying NOT NULL, "credential_data" jsonb, "document_urls" jsonb, "submitted_at" TIMESTAMP NOT NULL DEFAULT now(), "reviewed_at" TIMESTAMP, "reviewed_by" character varying, "review_note" text, CONSTRAINT "PK_66c6a7f6ce452cc6a36d4d5f6fd" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_verification_requests_user_id" ON "verification_requests" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_verification_requests_profile_id" ON "verification_requests" ("profile_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_verification_requests_status" ON "verification_requests" ("status") `,
    );
    await queryRunner.query(
      `ALTER TABLE "verification_requests" ADD CONSTRAINT "FK_verification_requests_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "verification_requests" ADD CONSTRAINT "FK_verification_requests_profile" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "verification_requests" DROP CONSTRAINT "FK_verification_requests_profile"`,
    );
    await queryRunner.query(
      `ALTER TABLE "verification_requests" DROP CONSTRAINT "FK_verification_requests_user"`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_verification_requests_status"`);
    await queryRunner.query(`DROP INDEX "public"."idx_verification_requests_profile_id"`);
    await queryRunner.query(`DROP INDEX "public"."idx_verification_requests_user_id"`);
    await queryRunner.query(`DROP TABLE "verification_requests"`);
  }
}
