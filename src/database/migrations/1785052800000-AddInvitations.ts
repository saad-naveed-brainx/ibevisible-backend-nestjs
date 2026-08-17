import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Multi-organization support: `base_domain` becomes optional (self-serve
 * signup creates a brand-new organization with no domain configured yet),
 * and `invitations` lets an existing member securely bring a teammate into
 * their own organization via a single-use, expiring token.
 */
export class AddInvitations1785052800000 implements MigrationInterface {
  name = 'AddInvitations1785052800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "organizations" ALTER COLUMN "base_domain" DROP NOT NULL
    `);

    await queryRunner.query(`
      CREATE TABLE "invitations" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "organization_id" uuid NOT NULL,
        "email" character varying(255) NOT NULL,
        "token_hash" character varying(64) NOT NULL,
        "invited_by_user_id" uuid,
        "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "accepted_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_invitations_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_invitations_token_hash" ON "invitations" ("token_hash")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_invitations_organization_id" ON "invitations" ("organization_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_invitations_invited_by_user_id" ON "invitations" ("invited_by_user_id")
    `);

    await queryRunner.query(`
      ALTER TABLE "invitations"
      ADD CONSTRAINT "FK_invitations_organization_id"
      FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "invitations"
      ADD CONSTRAINT "FK_invitations_invited_by_user_id"
      FOREIGN KEY ("invited_by_user_id") REFERENCES "users" ("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "invitations" DROP CONSTRAINT "FK_invitations_invited_by_user_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "invitations" DROP CONSTRAINT "FK_invitations_organization_id"`,
    );
    await queryRunner.query(`DROP INDEX "IDX_invitations_invited_by_user_id"`);
    await queryRunner.query(`DROP INDEX "IDX_invitations_organization_id"`);
    await queryRunner.query(`DROP INDEX "IDX_invitations_token_hash"`);
    await queryRunner.query(`DROP TABLE "invitations"`);

    await queryRunner.query(`
      ALTER TABLE "organizations" ALTER COLUMN "base_domain" SET NOT NULL
    `);
  }
}
