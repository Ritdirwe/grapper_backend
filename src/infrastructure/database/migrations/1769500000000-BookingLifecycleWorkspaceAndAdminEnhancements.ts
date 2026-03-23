import { MigrationInterface, QueryRunner } from 'typeorm';

export class BookingLifecycleWorkspaceAndAdminEnhancements1769500000000
  implements MigrationInterface
{
  name = 'BookingLifecycleWorkspaceAndAdminEnhancements1769500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."bookings_status_enum" ADD VALUE IF NOT EXISTS 'delivered'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."bookings_status_enum" ADD VALUE IF NOT EXISTS 'revision_requested'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."bookings_status_enum" ADD VALUE IF NOT EXISTS 'pending_completion_payment'`,
    );

    await queryRunner.query(
      `ALTER TABLE "bookings" ADD "corrections_used" integer NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD "corrections_limit" integer NOT NULL DEFAULT 5`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD "correction_fee" numeric(12,2) NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD "customer_approved" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD "customer_approved_at" TIMESTAMP`,
    );

    await queryRunner.query(
      `CREATE TYPE "public"."booking_corrections_status_enum" AS ENUM('pending', 'pending_payment', 'in_progress', 'resolved')`,
    );
    await queryRunner.query(
      `CREATE TABLE "booking_corrections" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "booking_id" uuid NOT NULL, "requested_by" uuid NOT NULL, "description" text NOT NULL, "attachments" jsonb, "correction_number" integer NOT NULL, "is_paid" boolean NOT NULL DEFAULT false, "payment_reference" character varying, "status" "public"."booking_corrections_status_enum" NOT NULL DEFAULT 'pending', "resolved_at" TIMESTAMP, CONSTRAINT "PK_booking_corrections_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_booking_corrections_booking" ON "booking_corrections" ("booking_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_booking_corrections_requested_by" ON "booking_corrections" ("requested_by") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_booking_corrections_status" ON "booking_corrections" ("status") `,
    );
    await queryRunner.query(
      `ALTER TABLE "booking_corrections" ADD CONSTRAINT "FK_booking_corrections_booking" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `CREATE TABLE "booking_files" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "booking_id" uuid NOT NULL, "uploaded_by" uuid NOT NULL, "filename" character varying NOT NULL, "original_name" character varying NOT NULL, "mime_type" character varying NOT NULL, "size" integer NOT NULL, "url" character varying NOT NULL, "file_type" character varying NOT NULL DEFAULT 'attachment', CONSTRAINT "PK_booking_files_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_booking_files_booking" ON "booking_files" ("booking_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_booking_files_uploaded_by" ON "booking_files" ("uploaded_by") `,
    );
    await queryRunner.query(
      `ALTER TABLE "booking_files" ADD CONSTRAINT "FK_booking_files_booking" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `CREATE TABLE "booking_messages" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "booking_id" uuid NOT NULL, "sender_id" uuid NOT NULL, "content" text NOT NULL, "message_type" character varying NOT NULL DEFAULT 'text', "attachments" jsonb, "read_at" TIMESTAMP, CONSTRAINT "PK_booking_messages_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_booking_messages_booking" ON "booking_messages" ("booking_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_booking_messages_sender" ON "booking_messages" ("sender_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "booking_messages" ADD CONSTRAINT "FK_booking_messages_booking" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "booking_messages" ADD CONSTRAINT "FK_booking_messages_sender" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `ALTER TABLE "reviews" ADD "booking_id" uuid`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_reviews_booking" ON "reviews" ("booking_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" ADD CONSTRAINT "FK_reviews_booking" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "reviews" DROP CONSTRAINT "FK_reviews_booking"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_reviews_booking"`);
    await queryRunner.query(`ALTER TABLE "reviews" DROP COLUMN "booking_id"`);

    await queryRunner.query(`ALTER TABLE "booking_messages" DROP CONSTRAINT "FK_booking_messages_sender"`);
    await queryRunner.query(`ALTER TABLE "booking_messages" DROP CONSTRAINT "FK_booking_messages_booking"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_booking_messages_sender"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_booking_messages_booking"`);
    await queryRunner.query(`DROP TABLE "booking_messages"`);

    await queryRunner.query(`ALTER TABLE "booking_files" DROP CONSTRAINT "FK_booking_files_booking"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_booking_files_uploaded_by"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_booking_files_booking"`);
    await queryRunner.query(`DROP TABLE "booking_files"`);

    await queryRunner.query(
      `ALTER TABLE "booking_corrections" DROP CONSTRAINT "FK_booking_corrections_booking"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_booking_corrections_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_booking_corrections_requested_by"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_booking_corrections_booking"`);
    await queryRunner.query(`DROP TABLE "booking_corrections"`);
    await queryRunner.query(`DROP TYPE "public"."booking_corrections_status_enum"`);

    await queryRunner.query(`ALTER TABLE "bookings" DROP COLUMN "customer_approved_at"`);
    await queryRunner.query(`ALTER TABLE "bookings" DROP COLUMN "customer_approved"`);
    await queryRunner.query(`ALTER TABLE "bookings" DROP COLUMN "correction_fee"`);
    await queryRunner.query(`ALTER TABLE "bookings" DROP COLUMN "corrections_limit"`);
    await queryRunner.query(`ALTER TABLE "bookings" DROP COLUMN "corrections_used"`);

    await queryRunner.query(
      `UPDATE "bookings" SET "status" = 'in_progress' WHERE "status" IN ('delivered', 'revision_requested', 'pending_completion_payment')`,
    );

    await queryRunner.query(`ALTER TYPE "public"."bookings_status_enum" RENAME TO "bookings_status_enum_new"`);
    await queryRunner.query(
      `CREATE TYPE "public"."bookings_status_enum" AS ENUM('pending', 'pending_deposit', 'confirmed', 'in_progress', 'completed', 'cancelled', 'disputed')`,
    );
    await queryRunner.query(`ALTER TABLE "bookings" ALTER COLUMN "status" DROP DEFAULT`);
    await queryRunner.query(
      `ALTER TABLE "bookings" ALTER COLUMN "status" TYPE "public"."bookings_status_enum" USING "status"::"text"::"public"."bookings_status_enum"`,
    );
    await queryRunner.query(`ALTER TABLE "bookings" ALTER COLUMN "status" SET DEFAULT 'pending'`);
    await queryRunner.query(`DROP TYPE "public"."bookings_status_enum_new"`);
  }
}
