import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Initial auth schema: organizations + users (scope §8).
 * Seeds the single default organization for the POC (Decision D1) so new
 * signups have an org to attach to.
 */
export class InitAuth1784880000000 implements MigrationInterface {
  name = 'InitAuth1784880000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    await queryRunner.query(`
      CREATE TABLE "organizations" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" character varying(255) NOT NULL,
        "base_domain" character varying(255) NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_organizations_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "email" character varying(255) NOT NULL,
        "password_hash" character varying(255) NOT NULL,
        "full_name" character varying(255),
        "organization_id" uuid NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_users_email" ON "users" ("email")`,
    );

    await queryRunner.query(`
      ALTER TABLE "users"
      ADD CONSTRAINT "FK_users_organization_id"
      FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // Seed the single POC organization (Decision D1).
    await queryRunner.query(`
      INSERT INTO "organizations" ("id", "name", "base_domain")
      VALUES (
        '00000000-0000-0000-0000-000000000001',
        'iBeVisible',
        'ibevisible.ai'
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "FK_users_organization_id"`,
    );
    await queryRunner.query(`DROP INDEX "IDX_users_email"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TABLE "organizations"`);
  }
}
