import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ChatSessionEntity } from './chat-session.entity';

export type ChatRole = 'user' | 'assistant' | 'system';

@Entity('chat_messages')
export class ChatMessageEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'session_id', type: 'uuid' })
  sessionId: string;

  @Column({ type: 'varchar', length: 20 })
  role: ChatRole;

  @Column({ type: 'text' })
  content: string;

  @Column({ name: 'tokens_estimate', type: 'integer', nullable: true })
  tokensEstimate: number | null;

  @Column({ type: 'jsonb', default: '{}' })
  metadata: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => ChatSessionEntity, (session) => session.messages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'session_id' })
  session: ChatSessionEntity;
}
