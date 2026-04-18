import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBookingMilestoneEscrowFlow1770900000000 implements MigrationInterface {
  name = 'AddBookingMilestoneEscrowFlow1770900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE "public"."booking_milestone_status_enum" AS ENUM('proposed', 'confirmed', 'pending', 'in_progress', 'submitted', 'approved', 'rejected'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "booking_milestones" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "booking_id" uuid NOT NULL,
        "created_by" uuid NOT NULL,
        "title" character varying NOT NULL,
        "description" text NOT NULL,
        "percent" numeric(5,2) NOT NULL,
        "estimated_amount" numeric(12,2) NOT NULL,
        "status" "public"."booking_milestone_status_enum" NOT NULL DEFAULT 'proposed',
        "sort_order" integer NOT NULL DEFAULT 0,
        "submitted_at" TIMESTAMP,
        "approved_at" TIMESTAMP,
        "rejected_at" TIMESTAMP,
        "rejection_reason" text,
        "metadata" jsonb,
        CONSTRAINT "PK_booking_milestones_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_booking_milestones_booking" ON "booking_milestones" ("booking_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_booking_milestones_status" ON "booking_milestones" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_booking_milestones_created_by" ON "booking_milestones" ("created_by")`,
    );
    await queryRunner.query(
      `ALTER TABLE "booking_milestones" ADD CONSTRAINT "FK_booking_milestones_booking" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "booking_milestones" ADD CONSTRAINT "FK_booking_milestones_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "booking_milestone_evidences" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "booking_id" uuid NOT NULL,
        "milestone_id" uuid NOT NULL,
        "uploaded_by" uuid NOT NULL,
        "storage_path" character varying NOT NULL,
        "url" character varying NOT NULL,
        "original_name" character varying NOT NULL,
        "mime_type" character varying NOT NULL,
        "size" integer NOT NULL,
        "note" text,
        "external_url" character varying,
        "metadata" jsonb,
        CONSTRAINT "PK_booking_milestone_evidences_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_booking_milestone_evidences_booking" ON "booking_milestone_evidences" ("booking_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_booking_milestone_evidences_milestone" ON "booking_milestone_evidences" ("milestone_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_booking_milestone_evidences_uploaded_by" ON "booking_milestone_evidences" ("uploaded_by")`,
    );
    await queryRunner.query(
      `ALTER TABLE "booking_milestone_evidences" ADD CONSTRAINT "FK_booking_milestone_evidences_booking" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "booking_milestone_evidences" ADD CONSTRAINT "FK_booking_milestone_evidences_milestone" FOREIGN KEY ("milestone_id") REFERENCES "booking_milestones"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "booking_milestone_evidences" ADD CONSTRAINT "FK_booking_milestone_evidences_uploaded_by" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "booking_milestone_evidences" DROP CONSTRAINT "FK_booking_milestone_evidences_uploaded_by"`);
    await queryRunner.query(`ALTER TABLE "booking_milestone_evidences" DROP CONSTRAINT "FK_booking_milestone_evidences_milestone"`);
    await queryRunner.query(`ALTER TABLE "booking_milestone_evidences" DROP CONSTRAINT "FK_booking_milestone_evidences_booking"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_booking_milestone_evidences_uploaded_by"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_booking_milestone_evidences_milestone"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_booking_milestone_evidences_booking"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "booking_milestone_evidences"`);

    await queryRunner.query(`ALTER TABLE "booking_milestones" DROP CONSTRAINT "FK_booking_milestones_created_by"`);
    await queryRunner.query(`ALTER TABLE "booking_milestones" DROP CONSTRAINT "FK_booking_milestones_booking"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_booking_milestones_created_by"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_booking_milestones_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_booking_milestones_booking"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "booking_milestones"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."booking_milestone_status_enum"`);
  }
}
