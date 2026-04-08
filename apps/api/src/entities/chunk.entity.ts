import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { FileEntity } from './file.entity';

export interface ChunkMetadata {
  language?: string;
  filePath?: string;
  functionName?: string;
  className?: string;
  imports?: string[];
  exports?: string[];
}

@Entity('chunks')
export class ChunkEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'file_id', type: 'uuid' })
  fileId: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ name: 'start_line', type: 'integer' })
  startLine: number;

  @Column({ name: 'end_line', type: 'integer' })
  endLine: number;

  // Note: pgvector column - we'll handle this specially in queries
  @Column({ type: 'vector', nullable: true, select: false })
  embedding: string | null;

  @Column({ type: 'jsonb', default: {} })
  metadata: ChunkMetadata;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => FileEntity, (file) => file.chunks, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'file_id' })
  file: FileEntity;
}
