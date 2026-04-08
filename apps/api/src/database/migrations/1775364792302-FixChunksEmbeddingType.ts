import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixChunksEmbeddingType1775364792302 implements MigrationInterface {
  name = 'FixChunksEmbeddingType1775364792302';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "vector"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_chunks_embedding"`);
    await queryRunner.query(`ALTER TABLE "chunks" ALTER COLUMN "embedding" TYPE vector(1536) USING CASE WHEN embedding IS NULL THEN NULL ELSE embedding::vector END`);
    await queryRunner.query(`CREATE INDEX "idx_chunks_embedding" ON "chunks" USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_chunks_embedding"`);
    await queryRunner.query(`ALTER TABLE "chunks" ALTER COLUMN "embedding" TYPE text USING CASE WHEN embedding IS NULL THEN NULL ELSE embedding::text END`);
    await queryRunner.query(`CREATE INDEX "idx_chunks_embedding" ON "chunks" ("embedding")`);
  }
}
