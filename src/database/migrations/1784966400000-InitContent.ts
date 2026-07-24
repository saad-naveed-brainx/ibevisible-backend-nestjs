import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Content schema: the single shared content_items table for all five content
 * types (scope §8). Type-specific fields are held in the `metadata` JSONB
 * column; the visibility layer is derived at render time and not stored here.
 */
export class InitContent1784966400000 implements MigrationInterface {
  name = 'InitContent1784966400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "content_items" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "organization_id" uuid NOT NULL,
        "type" character varying(32) NOT NULL,
        "title" character varying(255) NOT NULL,
        "slug" character varying(255) NOT NULL,
        "summary" text,
        "body" text,
        "status" character varying(16) NOT NULL DEFAULT 'draft',
        "author" character varying(255),
        "tags" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "published_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_content_items_id" PRIMARY KEY ("id")
      )
    `);

    // Duplicate-slug prevention within an organization (FR-2.4).
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_content_items_org_slug"
      ON "content_items" ("organization_id", "slug")
    `);

    // Filtering the content list by type and status (FR-3.3), ordered by
    // last-updated (FR-3.2).
    await queryRunner.query(`
      CREATE INDEX "IDX_content_items_org_type"
      ON "content_items" ("organization_id", "type")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_content_items_org_status"
      ON "content_items" ("organization_id", "status")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_content_items_org_updated_at"
      ON "content_items" ("organization_id", "updated_at")
    `);

    await queryRunner.query(`
      ALTER TABLE "content_items"
      ADD CONSTRAINT "FK_content_items_organization_id"
      FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "content_items" DROP CONSTRAINT "FK_content_items_organization_id"`,
    );
    await queryRunner.query(`DROP INDEX "IDX_content_items_org_updated_at"`);
    await queryRunner.query(`DROP INDEX "IDX_content_items_org_status"`);
    await queryRunner.query(`DROP INDEX "IDX_content_items_org_type"`);
    await queryRunner.query(`DROP INDEX "UQ_content_items_org_slug"`);
    await queryRunner.query(`DROP TABLE "content_items"`);
  }
}
