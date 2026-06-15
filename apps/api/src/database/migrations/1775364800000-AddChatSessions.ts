import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddChatSessions1775364800000 implements MigrationInterface {
  name = 'AddChatSessions1775364800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create chat_sessions table
    await queryRunner.query(`
      CREATE TABLE "chat_sessions" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "repository_id" UUID NOT NULL REFERENCES "repositories"("id") ON DELETE CASCADE,
        "name" VARCHAR(255),
        "created_by" VARCHAR(255),
        "created_at" TIMESTAMP DEFAULT NOW(),
        "updated_at" TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create chat_messages table
    await queryRunner.query(`
      CREATE TABLE "chat_messages" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "session_id" UUID NOT NULL REFERENCES "chat_sessions"("id") ON DELETE CASCADE,
        "role" VARCHAR(20) NOT NULL,
        "content" TEXT NOT NULL,
        "tokens_estimate" INTEGER,
        "metadata" JSONB DEFAULT '{}',
        "created_at" TIMESTAMP DEFAULT NOW()
      )
    `);

    // Indexes
    await queryRunner.query(`CREATE INDEX "idx_chat_sessions_repository_id" ON "chat_sessions"("repository_id")`);
    await queryRunner.query(`CREATE INDEX "idx_chat_messages_session_id" ON "chat_messages"("session_id")`);
    await queryRunner.query(`CREATE INDEX "idx_chat_messages_created_at" ON "chat_messages"("created_at")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_chat_messages_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_chat_messages_session_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_chat_sessions_repository_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "chat_messages"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "chat_sessions"`);
  }
}
