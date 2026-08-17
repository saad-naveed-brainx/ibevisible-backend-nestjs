import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * "Invite content creators": every user now has a role — `owner` (created
 * the organization at signup) or `content_creator` (joined via an invite
 * link). New column defaults everyone to `owner`, then the backfill demotes
 * every user except the earliest-created one in each organization, since
 * under the old single-role model that earliest user is the closest
 * approximation of "who created this org".
 */
export class AddUserRoles1785139200000 implements MigrationInterface {
  name = 'AddUserRoles1785139200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users" ADD COLUMN "role" character varying(32) NOT NULL DEFAULT 'owner'
    `);

    await queryRunner.query(`
      UPDATE "users" u
      SET "role" = 'content_creator'
      WHERE u."created_at" > (
        SELECT MIN(u2."created_at")
        FROM "users" u2
        WHERE u2."organization_id" = u."organization_id"
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "role"`);
  }
}
