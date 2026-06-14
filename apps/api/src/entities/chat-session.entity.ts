import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ChatMessageEntity } from './chat-message.entity';
import { RepositoryEntity } from './repository.entity';

@Entity('chat_sessions')
export class ChatSessionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'repository_id', type: 'uuid' })
  repositoryId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  name: string | null;

  @Column({ name: 'created_by', type: 'varchar', length: 255, nullable: true })
  createdBy: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => RepositoryEntity, (repo) => repo.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'repository_id' })
  repository: RepositoryEntity;

  @OneToMany(() => ChatMessageEntity, (msg) => msg.session)
  messages: ChatMessageEntity[];
}
