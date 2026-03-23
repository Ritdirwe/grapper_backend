import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRolePermissions1770100000000 implements MigrationInterface {
  name = 'AddRolePermissions1770100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "permission_definitions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "permission_key" character varying(128) NOT NULL,
        "label" character varying(128) NOT NULL,
        "domain" character varying(64) NOT NULL,
        "description" character varying(255) NOT NULL,
        CONSTRAINT "UQ_permission_definitions_permission_key" UNIQUE ("permission_key"),
        CONSTRAINT "PK_permission_definitions" PRIMARY KEY ("id")
      )`,
    );

    await queryRunner.query(
      `CREATE TYPE "public"."role_permissions_role_enum" AS ENUM('user', 'provider', 'admin')`,
    );

    await queryRunner.query(
      `CREATE TABLE "role_permissions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "role" "public"."role_permissions_role_enum" NOT NULL,
        "permission_key" character varying(128) NOT NULL,
        "enabled" boolean NOT NULL DEFAULT true,
        CONSTRAINT "UQ_role_permissions_role_permission_key" UNIQUE ("role", "permission_key"),
        CONSTRAINT "PK_role_permissions" PRIMARY KEY ("id")
      )`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_role_permissions_role" ON "role_permissions" ("role")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_role_permissions_permission_key" ON "role_permissions" ("permission_key")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_role_permissions_permission_key"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_role_permissions_role"`);
    await queryRunner.query(`DROP TABLE "role_permissions"`);
    await queryRunner.query(`DROP TYPE "public"."role_permissions_role_enum"`);
    await queryRunner.query(`DROP TABLE "permission_definitions"`);
  }
}
