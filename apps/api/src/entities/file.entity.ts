import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { RepositoryEntity } from './repository.entity';
import { ChunkEntity } from './chunk.entity';

@Entity('files')
export class FileEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'repository_id', type: 'uuid' })
  repositoryId: string;

  @Column({ type: 'text' })
  path: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  language: string | null;

  @Column({ type: 'integer', default: 0 })
  size: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  sha: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => RepositoryEntity, (repository) => repository.files, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'repository_id' })
  repository: RepositoryEntity;

  @OneToMany(() => ChunkEntity, (chunk) => chunk.file)
  chunks: ChunkEntity[];
}
