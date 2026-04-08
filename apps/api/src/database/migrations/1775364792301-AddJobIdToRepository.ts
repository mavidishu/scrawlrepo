import { MigrationInterface, QueryRunner } from "typeorm";

export class AddJobIdToRepository1775364792301 implements MigrationInterface {
    name = 'AddJobIdToRepository1775364792301'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "chunks" DROP CONSTRAINT "chunks_file_id_fkey"`);
        await queryRunner.query(`ALTER TABLE "files" DROP CONSTRAINT "files_repository_id_fkey"`);
        await queryRunner.query(`DROP INDEX "public"."idx_chunks_file_id"`);
        await queryRunner.query(`DROP INDEX "public"."idx_chunks_embedding"`);
        await queryRunner.query(`DROP INDEX "public"."idx_files_repository_id"`);
        await queryRunner.query(`DROP INDEX "public"."idx_repositories_status"`);
        await queryRunner.query(`ALTER TABLE "files" DROP CONSTRAINT "files_repository_id_path_key"`);
        await queryRunner.query(`ALTER TABLE "repositories" ADD "job_id" character varying(255)`);
        await queryRunner.query(`ALTER TABLE "chunks" DROP COLUMN "embedding"`);
        await queryRunner.query(`ALTER TABLE "chunks" ADD "embedding" vector(1536)`);
        await queryRunner.query(`ALTER TABLE "chunks" ALTER COLUMN "metadata" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "chunks" ALTER COLUMN "created_at" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "files" ALTER COLUMN "size" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "files" ALTER COLUMN "created_at" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "repositories" ALTER COLUMN "default_branch" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "repositories" ALTER COLUMN "status" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "repositories" ALTER COLUMN "file_count" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "repositories" ALTER COLUMN "created_at" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "repositories" ALTER COLUMN "updated_at" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "chunks" ADD CONSTRAINT "FK_b829a9d35b5a2a5d7de6d3f13d3" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "files" ADD CONSTRAINT "FK_0af085164215a6824d2f44ba5a5" FOREIGN KEY ("repository_id") REFERENCES "repositories"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "files" DROP CONSTRAINT "FK_0af085164215a6824d2f44ba5a5"`);
        await queryRunner.query(`ALTER TABLE "chunks" DROP CONSTRAINT "FK_b829a9d35b5a2a5d7de6d3f13d3"`);
        await queryRunner.query(`ALTER TABLE "repositories" ALTER COLUMN "updated_at" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "repositories" ALTER COLUMN "created_at" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "repositories" ALTER COLUMN "file_count" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "repositories" ALTER COLUMN "status" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "repositories" ALTER COLUMN "default_branch" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "files" ALTER COLUMN "created_at" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "files" ALTER COLUMN "size" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "chunks" ALTER COLUMN "created_at" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "chunks" ALTER COLUMN "metadata" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "chunks" DROP COLUMN "embedding"`);
        await queryRunner.query(`ALTER TABLE "chunks" ADD "embedding" vector(1536)`);
        await queryRunner.query(`ALTER TABLE "repositories" DROP COLUMN "job_id"`);
        await queryRunner.query(`ALTER TABLE "files" ADD CONSTRAINT "files_repository_id_path_key" UNIQUE ("repository_id", "path")`);
        await queryRunner.query(`CREATE INDEX "idx_repositories_status" ON "repositories" ("status") `);
        await queryRunner.query(`CREATE INDEX "idx_files_repository_id" ON "files" ("repository_id") `);
        await queryRunner.query(`CREATE INDEX "idx_chunks_embedding" ON "chunks" ("embedding") `);
        await queryRunner.query(`CREATE INDEX "idx_chunks_file_id" ON "chunks" ("file_id") `);
        await queryRunner.query(`ALTER TABLE "files" ADD CONSTRAINT "files_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "repositories"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "chunks" ADD CONSTRAINT "chunks_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
