import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1768610715999 implements MigrationInterface {
    name = 'InitialSchema1768610715999'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "push_tokens" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "user_id" uuid NOT NULL, "token" character varying NOT NULL, "platform" character varying NOT NULL DEFAULT 'expo', "device_id" character varying, "active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_32734e87f299c29ca3878861f4f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_869b4a9ba2c9e030aafc4b7dc7" ON "push_tokens" ("token") `);
        await queryRunner.query(`CREATE INDEX "IDX_94c371aff70dedeb89dae39f44" ON "push_tokens" ("user_id") `);
        await queryRunner.query(`ALTER TABLE "provider_profiles" ADD "stripe_account_id" character varying`);
        await queryRunner.query(`ALTER TABLE "provider_profiles" ADD "stripe_onboarding_complete" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "provider_profiles" ADD "paystack_subaccount_code" character varying`);
        await queryRunner.query(`ALTER TABLE "bookings" ADD "reference_code" character varying`);
        await queryRunner.query(`ALTER TABLE "bookings" ADD CONSTRAINT "UQ_60bc16929d8e767999884e54481" UNIQUE ("reference_code")`);
        await queryRunner.query(`ALTER TABLE "bookings" ADD "deposit_amount" numeric(12,2)`);
        await queryRunner.query(`ALTER TABLE "bookings" ADD "platform_fee" numeric(12,2)`);
        await queryRunner.query(`ALTER TABLE "bookings" ADD "deposit_paid" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "bookings" ADD "final_payment_paid" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "bookings" ADD "stripe_session_id" character varying`);
        await queryRunner.query(`ALTER TABLE "bookings" ADD "paystack_reference" character varying`);
        await queryRunner.query(`ALTER TABLE "bookings" ADD "cancellation_deadline" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "bookings" ADD "booking_deadline" TIMESTAMP`);
        await queryRunner.query(`ALTER TYPE "public"."bookings_status_enum" RENAME TO "bookings_status_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."bookings_status_enum" AS ENUM('pending', 'pending_deposit', 'confirmed', 'in_progress', 'completed', 'cancelled', 'disputed')`);
        await queryRunner.query(`ALTER TABLE "bookings" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "bookings" ALTER COLUMN "status" TYPE "public"."bookings_status_enum" USING "status"::"text"::"public"."bookings_status_enum"`);
        await queryRunner.query(`ALTER TABLE "bookings" ALTER COLUMN "status" SET DEFAULT 'pending'`);
        await queryRunner.query(`DROP TYPE "public"."bookings_status_enum_old"`);
        await queryRunner.query(`CREATE INDEX "IDX_60bc16929d8e767999884e5448" ON "bookings" ("reference_code") `);
        await queryRunner.query(`ALTER TABLE "push_tokens" ADD CONSTRAINT "FK_94c371aff70dedeb89dae39f440" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "push_tokens" DROP CONSTRAINT "FK_94c371aff70dedeb89dae39f440"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_60bc16929d8e767999884e5448"`);
        await queryRunner.query(`CREATE TYPE "public"."bookings_status_enum_old" AS ENUM('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'disputed')`);
        await queryRunner.query(`ALTER TABLE "bookings" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "bookings" ALTER COLUMN "status" TYPE "public"."bookings_status_enum_old" USING "status"::"text"::"public"."bookings_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "bookings" ALTER COLUMN "status" SET DEFAULT 'pending'`);
        await queryRunner.query(`DROP TYPE "public"."bookings_status_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."bookings_status_enum_old" RENAME TO "bookings_status_enum"`);
        await queryRunner.query(`ALTER TABLE "bookings" DROP COLUMN "booking_deadline"`);
        await queryRunner.query(`ALTER TABLE "bookings" DROP COLUMN "cancellation_deadline"`);
        await queryRunner.query(`ALTER TABLE "bookings" DROP COLUMN "paystack_reference"`);
        await queryRunner.query(`ALTER TABLE "bookings" DROP COLUMN "stripe_session_id"`);
        await queryRunner.query(`ALTER TABLE "bookings" DROP COLUMN "final_payment_paid"`);
        await queryRunner.query(`ALTER TABLE "bookings" DROP COLUMN "deposit_paid"`);
        await queryRunner.query(`ALTER TABLE "bookings" DROP COLUMN "platform_fee"`);
        await queryRunner.query(`ALTER TABLE "bookings" DROP COLUMN "deposit_amount"`);
        await queryRunner.query(`ALTER TABLE "bookings" DROP CONSTRAINT "UQ_60bc16929d8e767999884e54481"`);
        await queryRunner.query(`ALTER TABLE "bookings" DROP COLUMN "reference_code"`);
        await queryRunner.query(`ALTER TABLE "provider_profiles" DROP COLUMN "paystack_subaccount_code"`);
        await queryRunner.query(`ALTER TABLE "provider_profiles" DROP COLUMN "stripe_onboarding_complete"`);
        await queryRunner.query(`ALTER TABLE "provider_profiles" DROP COLUMN "stripe_account_id"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_94c371aff70dedeb89dae39f44"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_869b4a9ba2c9e030aafc4b7dc7"`);
        await queryRunner.query(`DROP TABLE "push_tokens"`);
    }

}
