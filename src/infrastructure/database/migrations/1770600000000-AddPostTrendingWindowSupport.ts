import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPostTrendingWindowSupport1770600000000 implements MigrationInterface {
  name = 'AddPostTrendingWindowSupport1770600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "trending_score" numeric(10,2) NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "last_engaged_at" TIMESTAMP`,
    );

    await queryRunner.query(`
      UPDATE "posts"
      SET
        "trending_score" = (
          COALESCE("likes_count", 0) * 1 +
          COALESCE("comments_count", 0) * 2 +
          COALESCE("shares_count", 0) * 3
        )::numeric(10,2),
        "last_engaged_at" = CASE
          WHEN (COALESCE("likes_count", 0) + COALESCE("comments_count", 0) + COALESCE("shares_count", 0)) > 0
            THEN COALESCE("updated_at", NOW())
          ELSE NULL
        END
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_posts_public_trending_score_created_at" ON "posts" ("trending_score" DESC, "created_at" DESC) WHERE "visibility" = 'public'`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_posts_visibility_created_at" ON "posts" ("visibility", "created_at" DESC)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_posts_visibility_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_posts_public_trending_score_created_at"`);
    await queryRunner.query(`ALTER TABLE "posts" DROP COLUMN IF EXISTS "last_engaged_at"`);
    await queryRunner.query(`ALTER TABLE "posts" DROP COLUMN IF EXISTS "trending_score"`);
  }
}
