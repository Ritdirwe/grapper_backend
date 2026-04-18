import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSavedPaymentMethods1770900000000 implements MigrationInterface {
  name = 'AddSavedPaymentMethods1770900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "preferred_saved_payment_method_id" uuid`,
    );

    await queryRunner.query(
      `ALTER TABLE "profiles" ALTER COLUMN "preferred_saved_payment_method_id" TYPE uuid USING NULLIF("preferred_saved_payment_method_id"::text, '')::uuid`,
    );

    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE "public"."saved_payment_methods_gateway_enum" AS ENUM('paystack', 'stripe', 'flutterwave'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "saved_payment_methods" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "user_id" uuid NOT NULL,
        "gateway" "public"."saved_payment_methods_gateway_enum" NOT NULL,
        "provider_authorization_id" character varying NOT NULL,
        "authorization_code" character varying,
        "card_brand" character varying,
        "last4" character varying,
        "expiry_month" character varying,
        "expiry_year" character varying,
        "is_reusable" boolean NOT NULL DEFAULT true,
        "is_default" boolean NOT NULL DEFAULT false,
        "metadata" jsonb,
        CONSTRAINT "PK_saved_payment_methods_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_saved_payment_methods_user_id" ON "saved_payment_methods" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_saved_payment_methods_user_default" ON "saved_payment_methods" ("user_id", "is_default")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_saved_payment_methods_gateway_authorization" ON "saved_payment_methods" ("gateway", "provider_authorization_id")`,
    );

    await queryRunner.query(
      `ALTER TABLE "saved_payment_methods" ADD CONSTRAINT "FK_saved_payment_methods_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "profiles" ADD CONSTRAINT "FK_profiles_preferred_saved_payment_method" FOREIGN KEY ("preferred_saved_payment_method_id") REFERENCES "saved_payment_methods"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "profiles" DROP CONSTRAINT IF EXISTS "FK_profiles_preferred_saved_payment_method"`,
    );
    await queryRunner.query(
      `ALTER TABLE "saved_payment_methods" DROP CONSTRAINT IF EXISTS "FK_saved_payment_methods_user"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_saved_payment_methods_gateway_authorization"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_saved_payment_methods_user_default"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_saved_payment_methods_user_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "saved_payment_methods"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."saved_payment_methods_gateway_enum"`);
    await queryRunner.query(
      `ALTER TABLE "profiles" DROP COLUMN IF EXISTS "preferred_saved_payment_method_id"`,
    );
  }
}
