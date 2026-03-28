import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSupportTickets1770700000000 implements MigrationInterface {
  name = 'AddSupportTickets1770700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."support_tickets_category_enum" AS ENUM('payment', 'order', 'service', 'other')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."support_tickets_status_enum" AS ENUM('open', 'under_review', 'awaiting_user', 'resolved', 'closed')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."support_tickets_priority_enum" AS ENUM('low', 'normal', 'high', 'urgent')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."support_ticket_messages_sender_role_enum" AS ENUM('user', 'provider', 'admin', 'system')`,
    );

    await queryRunner.query(
      `CREATE TABLE "support_tickets" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "ticket_number" character varying NOT NULL,
        "creator_id" uuid NOT NULL,
        "category" "public"."support_tickets_category_enum" NOT NULL DEFAULT 'other',
        "target_id" character varying,
        "subject" character varying(180) NOT NULL,
        "description" text NOT NULL,
        "status" "public"."support_tickets_status_enum" NOT NULL DEFAULT 'open',
        "priority" "public"."support_tickets_priority_enum" NOT NULL DEFAULT 'normal',
        "last_reply_at" TIMESTAMP,
        "closed_at" TIMESTAMP,
        CONSTRAINT "UQ_support_tickets_ticket_number" UNIQUE ("ticket_number"),
        CONSTRAINT "PK_support_tickets_id" PRIMARY KEY ("id")
      )`,
    );

    await queryRunner.query(
      `CREATE TABLE "support_ticket_messages" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "ticket_id" uuid NOT NULL,
        "sender_id" uuid,
        "sender_role" "public"."support_ticket_messages_sender_role_enum" NOT NULL DEFAULT 'user',
        "message" text NOT NULL,
        "attachments" jsonb,
        "is_internal_note" boolean NOT NULL DEFAULT false,
        CONSTRAINT "PK_support_ticket_messages_id" PRIMARY KEY ("id")
      )`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_support_tickets_creator_id" ON "support_tickets" ("creator_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_support_tickets_status" ON "support_tickets" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_support_tickets_category" ON "support_tickets" ("category")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_support_tickets_last_reply_at" ON "support_tickets" ("last_reply_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_support_ticket_messages_ticket_id" ON "support_ticket_messages" ("ticket_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_support_ticket_messages_sender_id" ON "support_ticket_messages" ("sender_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_support_ticket_messages_created_at" ON "support_ticket_messages" ("created_at")`,
    );

    await queryRunner.query(
      `ALTER TABLE "support_tickets"
       ADD CONSTRAINT "FK_support_tickets_creator_id_users"
       FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "support_ticket_messages"
       ADD CONSTRAINT "FK_support_ticket_messages_ticket_id"
       FOREIGN KEY ("ticket_id") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "support_ticket_messages"
       ADD CONSTRAINT "FK_support_ticket_messages_sender_id_users"
       FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "support_ticket_messages" DROP CONSTRAINT "FK_support_ticket_messages_sender_id_users"`,
    );
    await queryRunner.query(
      `ALTER TABLE "support_ticket_messages" DROP CONSTRAINT "FK_support_ticket_messages_ticket_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "support_tickets" DROP CONSTRAINT "FK_support_tickets_creator_id_users"`,
    );

    await queryRunner.query(`DROP INDEX "public"."IDX_support_ticket_messages_created_at"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_support_ticket_messages_sender_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_support_ticket_messages_ticket_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_support_tickets_last_reply_at"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_support_tickets_category"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_support_tickets_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_support_tickets_creator_id"`);

    await queryRunner.query(`DROP TABLE "support_ticket_messages"`);
    await queryRunner.query(`DROP TABLE "support_tickets"`);
    await queryRunner.query(`DROP TYPE "public"."support_ticket_messages_sender_role_enum"`);
    await queryRunner.query(`DROP TYPE "public"."support_tickets_priority_enum"`);
    await queryRunner.query(`DROP TYPE "public"."support_tickets_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."support_tickets_category_enum"`);
  }
}
