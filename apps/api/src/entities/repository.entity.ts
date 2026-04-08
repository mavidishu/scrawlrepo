import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { FileEntity } from './file.entity';

export type RepositoryStatus = 'pending' | 'indexing' | 'ready' | 'failed';

@Entity('repositories')
export class RepositoryEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'github_url', type: 'text', unique: true })
  githubUrl: string;

  @Column({ type: 'varchar', length: 255 })
  owner: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ name: 'default_branch', type: 'varchar', length: 255, default: 'main' })
  defaultBranch: string;

  @Column({ type: 'varchar', length: 50, default: 'pending' })
  status: RepositoryStatus;

  @Column({ name: 'file_count', type: 'integer', default: 0 })
  fileCount: number;

  @Column({ name: 'indexed_at', type: 'timestamp', nullable: true })
  indexedAt: Date | null;

  @Column({ name: 'job_id', type: 'varchar', length: 255, nullable: true })
  jobId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => FileEntity, (file) => file.repository)
  files: FileEntity[];
}
