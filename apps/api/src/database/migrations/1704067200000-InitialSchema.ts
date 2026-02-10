import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1704067200000 implements MigrationInterface {
  name = 'InitialSchema1704067200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable extensions
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "vector"`);

    // Create repositories table
    await queryRunner.query(`
      CREATE TABLE "repositories" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "github_url" TEXT NOT NULL UNIQUE,
        "owner" VARCHAR(255) NOT NULL,
        "name" VARCHAR(255) NOT NULL,
        "default_branch" VARCHAR(255) DEFAULT 'main',
        "status" VARCHAR(50) DEFAULT 'pending',
        "file_count" INTEGER DEFAULT 0,
        "indexed_at" TIMESTAMP,
        "created_at" TIMESTAMP DEFAULT NOW(),
        "updated_at" TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create files table
    await queryRunner.query(`
      CREATE TABLE "files" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "repository_id" UUID NOT NULL REFERENCES "repositories"("id") ON DELETE CASCADE,
        "path" TEXT NOT NULL,
        "language" VARCHAR(50),
        "size" INTEGER DEFAULT 0,
        "sha" VARCHAR(255),
        "created_at" TIMESTAMP DEFAULT NOW(),
        UNIQUE("repository_id", "path")
      )
    `);

    // Create chunks table with vector embedding
    await queryRunner.query(`
      CREATE TABLE "chunks" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "file_id" UUID NOT NULL REFERENCES "files"("id") ON DELETE CASCADE,
        "content" TEXT NOT NULL,
        "start_line" INTEGER NOT NULL,
        "end_line" INTEGER NOT NULL,
        "embedding" vector(1536),
        "metadata" JSONB DEFAULT '{}',
        "created_at" TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX "idx_repositories_status" ON "repositories"("status")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_files_repository_id" ON "files"("repository_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_chunks_file_id" ON "chunks"("file_id")
    `);

    // Create vector similarity index (IVFFlat for approximate nearest neighbor search)
    await queryRunner.query(`
      CREATE INDEX "idx_chunks_embedding" ON "chunks" 
      USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_chunks_embedding"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_chunks_file_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_files_repository_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_repositories_status"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "chunks"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "files"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "repositories"`);
  }
}
