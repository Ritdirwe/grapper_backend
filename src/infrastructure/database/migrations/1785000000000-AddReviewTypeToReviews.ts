import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReviewTypeToReviews1785000000000 implements MigrationInterface {
  name = 'AddReviewTypeToReviews1785000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "public"."reviews_review_type_enum" AS ENUM('customer', 'provider')`);
    await queryRunner.query(
      `ALTER TABLE "reviews" ADD "review_type" "public"."reviews_review_type_enum" NOT NULL DEFAULT 'customer'`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_reviews_booking_id" ON "reviews" ("booking_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_reviews_booking_id"`);
    await queryRunner.query(`ALTER TABLE "reviews" DROP COLUMN "review_type"`);
    await queryRunner.query(`DROP TYPE "public"."reviews_review_type_enum"`);
  }
}
