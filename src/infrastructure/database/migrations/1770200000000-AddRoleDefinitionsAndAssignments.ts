import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRoleDefinitionsAndAssignments1770200000000
  implements MigrationInterface
{
  name = 'AddRoleDefinitionsAndAssignments1770200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "role_definitions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "role_key" character varying(32) NOT NULL,
        "label" character varying(64) NOT NULL,
        "description" character varying(255),
        "is_system" boolean NOT NULL DEFAULT true,
        CONSTRAINT "PK_role_definitions_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_role_definitions_role_key" UNIQUE ("role_key")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_role_assignments" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "user_id" uuid NOT NULL,
        "role_key" character varying(32) NOT NULL,
        "is_primary" boolean NOT NULL DEFAULT false,
        "assigned_by" uuid,
        CONSTRAINT "PK_user_role_assignments_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_user_role_assignments_user_role" UNIQUE ("user_id", "role_key"),
        CONSTRAINT "FK_user_role_assignments_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_user_role_assignments_assigned_by" FOREIGN KEY ("assigned_by") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_user_role_assignments_user_id"
      ON "user_role_assignments" ("user_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_user_role_assignments_role_key"
      ON "user_role_assignments" ("role_key")
    `);

    await queryRunner.query(`
      INSERT INTO "role_definitions" ("role_key", "label", "description", "is_system")
      VALUES
        ('user', 'User', 'Consumer role', true),
        ('provider', 'Provider', 'Service provider role', true),
        ('admin', 'Admin', 'Platform administrator role', true)
      ON CONFLICT ("role_key") DO UPDATE
      SET
        "label" = EXCLUDED."label",
        "description" = EXCLUDED."description",
        "is_system" = true,
        "updated_at" = now()
    `);

    await queryRunner.query(`
      INSERT INTO "user_role_assignments" ("user_id", "role_key", "is_primary")
      SELECT u."id", u."role"::text, true
      FROM "users" u
      LEFT JOIN "user_role_assignments" ura ON ura."user_id" = u."id"
      WHERE ura."user_id" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_user_role_assignments_role_key"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_user_role_assignments_user_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_role_assignments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "role_definitions"`);
  }
}
