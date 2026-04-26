import { MigrationInterface, QueryRunner } from "typeorm";

export class NotificationTable1777082708373 implements MigrationInterface {
    name = 'NotificationTable1777082708373'

    private async tableExists(queryRunner: QueryRunner, tableName: string): Promise<boolean> {
        return queryRunner.hasTable(tableName);
    }

    private async columnExists(queryRunner: QueryRunner, tableName: string, columnName: string): Promise<boolean> {
        return queryRunner.hasColumn(tableName, columnName);
    }

    private async indexExists(queryRunner: QueryRunner, tableName: string, indexName: string): Promise<boolean> {
        const table = await queryRunner.getTable(tableName);
        return Boolean(table?.indices.find((index) => index.name === indexName));
    }

    private async foreignKeyExists(queryRunner: QueryRunner, tableName: string, foreignKeyName: string): Promise<boolean> {
        const table = await queryRunner.getTable(tableName);
        return Boolean(table?.foreignKeys.find((fk) => fk.name === foreignKeyName));
    }

    private async typeExists(queryRunner: QueryRunner, typeName: string): Promise<boolean> {
        const result = await queryRunner.query(
            `SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'public' AND t.typname = $1 LIMIT 1`,
            [typeName],
        );
        return result.length > 0;
    }

    public async up(queryRunner: QueryRunner): Promise<void> {
        if (await this.foreignKeyExists(queryRunner, 'reviews', 'FK_728447781a30bc3fcfe5c2f1cdf')) {
            await queryRunner.query(`ALTER TABLE "reviews" DROP CONSTRAINT "FK_728447781a30bc3fcfe5c2f1cdf"`);
        }
        if (await this.foreignKeyExists(queryRunner, 'reviews', 'FK_bbd6ac6e3e6a8f8c6e0e8692d63')) {
            await queryRunner.query(`ALTER TABLE "reviews" DROP CONSTRAINT "FK_bbd6ac6e3e6a8f8c6e0e8692d63"`);
        }
        if (await this.indexExists(queryRunner, 'reviews', 'IDX_728447781a30bc3fcfe5c2f1cd')) {
            await queryRunner.query(`DROP INDEX "public"."IDX_728447781a30bc3fcfe5c2f1cd"`);
        }
        if (!(await this.typeExists(queryRunner, 'waitlist_entries_role_enum'))) {
            await queryRunner.query(`CREATE TYPE "public"."waitlist_entries_role_enum" AS ENUM('user', 'provider')`);
        }
        if (!(await this.typeExists(queryRunner, 'waitlist_entries_gender_enum'))) {
            await queryRunner.query(`CREATE TYPE "public"."waitlist_entries_gender_enum" AS ENUM('male', 'female', 'other', 'prefer_not_to_say')`);
        }
        if (!(await this.typeExists(queryRunner, 'waitlist_entries_verificationstatus_enum'))) {
            await queryRunner.query(`CREATE TYPE "public"."waitlist_entries_verificationstatus_enum" AS ENUM('unverified', 'pending', 'verified', 'rejected')`);
        }
        if (!(await this.tableExists(queryRunner, 'waitlist_entries'))) {
            await queryRunner.query(`CREATE TABLE "waitlist_entries" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "email" character varying NOT NULL, "phone_number" character varying, "role" "public"."waitlist_entries_role_enum" NOT NULL, "password_hash" character varying NOT NULL, "full_name" character varying, "display_name" character varying, "bio" text, "avatar_url" character varying, "cover_image_url" character varying, "birthdate" date, "gender" "public"."waitlist_entries_gender_enum", "location" character varying, "country" character varying, "city" character varying, "website" character varying, "university" character varying, "socialLinks" jsonb, "verificationStatus" "public"."waitlist_entries_verificationstatus_enum" NOT NULL DEFAULT 'unverified', "verification_document_url" character varying, "business_name" character varying, "description" text, "skills" jsonb, "certifications" jsonb, "years_of_experience" integer, "portfolio" jsonb, "hourly_rate" numeric(10,2), "currency" character varying, "response_time_hours" integer, "completion_rate" numeric(5,2) NOT NULL DEFAULT '0', "total_earnings" numeric(12,2) NOT NULL DEFAULT '0', "total_jobs" integer NOT NULL DEFAULT '0', "average_rating" numeric(3,2) NOT NULL DEFAULT '0', "total_reviews" integer NOT NULL DEFAULT '0', "is_available" boolean NOT NULL DEFAULT true, "availability_hours" jsonb, "last_active_at" TIMESTAMP, "stripe_account_id" character varying, "stripe_onboarding_complete" boolean NOT NULL DEFAULT false, "paystack_subaccount_code" character varying, "is_promoted" boolean NOT NULL DEFAULT false, "promoted_user_id" character varying, "promoted_at" TIMESTAMP, CONSTRAINT "UQ_90cae6cb55d051291054d7e8d12" UNIQUE ("email"), CONSTRAINT "UQ_5a9237975aeedc4c7ef42b716d5" UNIQUE ("phone_number"), CONSTRAINT "PK_bd0ef66fff81d3be7b7a1568a4d" PRIMARY KEY ("id"))`);
        }
        if (!(await this.tableExists(queryRunner, 'notifications'))) {
            await queryRunner.query(`CREATE TABLE "notifications" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "recipient_id" character varying NOT NULL, "actor_id" character varying, "type" character varying(50) NOT NULL, "title" character varying NOT NULL, "body" character varying NOT NULL, "channel" character varying NOT NULL DEFAULT 'in_app', "entity_type" character varying, "entity_id" character varying, "action_url" character varying, "read_at" TIMESTAMP, "sent_at" TIMESTAMP, CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY ("id"))`);
        }
        if (!(await this.indexExists(queryRunner, 'notifications', 'IDX_5332a4daa46fd3f4e6625dd275'))) {
            await queryRunner.query(`CREATE INDEX "IDX_5332a4daa46fd3f4e6625dd275" ON "notifications" ("recipient_id") `);
        }
        if (await this.columnExists(queryRunner, 'reviews', 'user_id')) {
            await queryRunner.query(`ALTER TABLE "reviews" DROP COLUMN "user_id"`);
        }
        if (await this.columnExists(queryRunner, 'reviews', 'helpfulCount')) {
            await queryRunner.query(`ALTER TABLE "reviews" DROP COLUMN "helpfulCount"`);
        }
        if (await this.columnExists(queryRunner, 'reviews', 'helpfulUserIds')) {
            await queryRunner.query(`ALTER TABLE "reviews" DROP COLUMN "helpfulUserIds"`);
        }
        if (await this.columnExists(queryRunner, 'reviews', 'response')) {
            await queryRunner.query(`ALTER TABLE "reviews" DROP COLUMN "response"`);
        }
        if (!(await this.columnExists(queryRunner, 'reviews', 'reviewer_id'))) {
            await queryRunner.query(`ALTER TABLE "reviews" ADD "reviewer_id" uuid NOT NULL`);
        }
        if (!(await this.columnExists(queryRunner, 'reviews', 'images'))) {
            await queryRunner.query(`ALTER TABLE "reviews" ADD "images" jsonb`);
        }
        if (!(await this.columnExists(queryRunner, 'reviews', 'provider_response'))) {
            await queryRunner.query(`ALTER TABLE "reviews" ADD "provider_response" text`);
        }
        if (!(await this.columnExists(queryRunner, 'reviews', 'provider_response_at'))) {
            await queryRunner.query(`ALTER TABLE "reviews" ADD "provider_response_at" TIMESTAMP`);
        }
        if (!(await this.columnExists(queryRunner, 'reviews', 'is_verified_purchase'))) {
            await queryRunner.query(`ALTER TABLE "reviews" ADD "is_verified_purchase" boolean NOT NULL DEFAULT false`);
        }
        if (!(await this.columnExists(queryRunner, 'reviews', 'helpful_count'))) {
            await queryRunner.query(`ALTER TABLE "reviews" ADD "helpful_count" integer NOT NULL DEFAULT '0'`);
        }
        if (!(await this.columnExists(queryRunner, 'reviews', 'is_hidden'))) {
            await queryRunner.query(`ALTER TABLE "reviews" ADD "is_hidden" boolean NOT NULL DEFAULT false`);
        }
        if (!(await this.columnExists(queryRunner, 'reviews', 'user_id'))) {
            await queryRunner.query(`ALTER TABLE "reviews" ADD "user_id" uuid NOT NULL`);
        }
        if (!(await this.columnExists(queryRunner, 'reviews', 'response'))) {
            await queryRunner.query(`ALTER TABLE "reviews" ADD "response" text`);
        }
        if (!(await this.columnExists(queryRunner, 'reviews', 'helpfulCount'))) {
            await queryRunner.query(`ALTER TABLE "reviews" ADD "helpfulCount" integer NOT NULL DEFAULT '0'`);
        }
        if (!(await this.columnExists(queryRunner, 'reviews', 'helpfulUserIds'))) {
            await queryRunner.query(`ALTER TABLE "reviews" ADD "helpfulUserIds" jsonb NOT NULL DEFAULT '[]'`);
        }
        if (await this.columnExists(queryRunner, 'reviews', 'booking_id')) {
            await queryRunner.query(`ALTER TABLE "reviews" DROP COLUMN "booking_id"`);
        }
        await queryRunner.query(`ALTER TABLE "reviews" ADD "booking_id" character varying`);
        await queryRunner.query(`ALTER TABLE "reviews" ALTER COLUMN "comment" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "reviews" DROP COLUMN "booking_id"`);
        await queryRunner.query(`ALTER TABLE "reviews" ADD "booking_id" uuid`);
        if (!(await this.indexExists(queryRunner, 'reviews', 'IDX_92e950a2513a79bb3fab273c92'))) {
            await queryRunner.query(`CREATE INDEX "IDX_92e950a2513a79bb3fab273c92" ON "reviews" ("reviewer_id") `);
        }
        if (!(await this.indexExists(queryRunner, 'reviews', 'IDX_728447781a30bc3fcfe5c2f1cd'))) {
            await queryRunner.query(`CREATE INDEX "IDX_728447781a30bc3fcfe5c2f1cd" ON "reviews" ("user_id") `);
        }
        await queryRunner.query(`ALTER TABLE "reviews" ADD CONSTRAINT "UQ_f932d1a5c8441e4266f8a404154" UNIQUE ("service_id", "reviewer_id")`);
        if (!(await this.foreignKeyExists(queryRunner, 'reviews', 'FK_92e950a2513a79bb3fab273c92e'))) {
            await queryRunner.query(`ALTER TABLE "reviews" ADD CONSTRAINT "FK_92e950a2513a79bb3fab273c92e" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        }
        if (!(await this.foreignKeyExists(queryRunner, 'reviews', 'FK_bbd6ac6e3e6a8f8c6e0e8692d63'))) {
            await queryRunner.query(`ALTER TABLE "reviews" ADD CONSTRAINT "FK_bbd6ac6e3e6a8f8c6e0e8692d63" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        }
        if (!(await this.foreignKeyExists(queryRunner, 'reviews', 'FK_728447781a30bc3fcfe5c2f1cdf'))) {
            await queryRunner.query(`ALTER TABLE "reviews" ADD CONSTRAINT "FK_728447781a30bc3fcfe5c2f1cdf" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "reviews" DROP CONSTRAINT "FK_728447781a30bc3fcfe5c2f1cdf"`);
        await queryRunner.query(`ALTER TABLE "reviews" DROP CONSTRAINT "FK_bbd6ac6e3e6a8f8c6e0e8692d63"`);
        await queryRunner.query(`ALTER TABLE "reviews" DROP CONSTRAINT "FK_92e950a2513a79bb3fab273c92e"`);
        await queryRunner.query(`ALTER TABLE "reviews" DROP CONSTRAINT "UQ_f932d1a5c8441e4266f8a404154"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_728447781a30bc3fcfe5c2f1cd"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_92e950a2513a79bb3fab273c92"`);
        await queryRunner.query(`ALTER TABLE "reviews" DROP COLUMN "booking_id"`);
        await queryRunner.query(`ALTER TABLE "reviews" ADD "booking_id" character varying`);
        await queryRunner.query(`ALTER TABLE "reviews" ALTER COLUMN "comment" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "reviews" DROP COLUMN "booking_id"`);
        await queryRunner.query(`ALTER TABLE "reviews" ADD "booking_id" uuid`);
        await queryRunner.query(`ALTER TABLE "reviews" DROP COLUMN "helpfulUserIds"`);
        await queryRunner.query(`ALTER TABLE "reviews" DROP COLUMN "helpfulCount"`);
        await queryRunner.query(`ALTER TABLE "reviews" DROP COLUMN "response"`);
        await queryRunner.query(`ALTER TABLE "reviews" DROP COLUMN "user_id"`);
        await queryRunner.query(`ALTER TABLE "reviews" DROP COLUMN "is_hidden"`);
        await queryRunner.query(`ALTER TABLE "reviews" DROP COLUMN "helpful_count"`);
        await queryRunner.query(`ALTER TABLE "reviews" DROP COLUMN "is_verified_purchase"`);
        await queryRunner.query(`ALTER TABLE "reviews" DROP COLUMN "provider_response_at"`);
        await queryRunner.query(`ALTER TABLE "reviews" DROP COLUMN "provider_response"`);
        await queryRunner.query(`ALTER TABLE "reviews" DROP COLUMN "images"`);
        await queryRunner.query(`ALTER TABLE "reviews" DROP COLUMN "reviewer_id"`);
        await queryRunner.query(`ALTER TABLE "reviews" ADD "response" text`);
        await queryRunner.query(`ALTER TABLE "reviews" ADD "helpfulUserIds" jsonb NOT NULL DEFAULT '[]'`);
        await queryRunner.query(`ALTER TABLE "reviews" ADD "helpfulCount" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "reviews" ADD "user_id" uuid NOT NULL`);
        await queryRunner.query(`DROP INDEX "public"."IDX_5332a4daa46fd3f4e6625dd275"`);
        await queryRunner.query(`DROP TABLE "notifications"`);
        await queryRunner.query(`DROP TABLE "waitlist_entries"`);
        await queryRunner.query(`DROP TYPE "public"."waitlist_entries_verificationstatus_enum"`);
        await queryRunner.query(`DROP TYPE "public"."waitlist_entries_gender_enum"`);
        await queryRunner.query(`DROP TYPE "public"."waitlist_entries_role_enum"`);
        await queryRunner.query(`CREATE INDEX "IDX_728447781a30bc3fcfe5c2f1cd" ON "reviews" ("user_id") `);
        await queryRunner.query(`ALTER TABLE "reviews" ADD CONSTRAINT "FK_bbd6ac6e3e6a8f8c6e0e8692d63" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reviews" ADD CONSTRAINT "FK_728447781a30bc3fcfe5c2f1cdf" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
