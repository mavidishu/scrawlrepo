import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export type McpEventStatus = 'pending' | 'delivered' | 'failed';

@Entity({ name: 'mcp_event_log' })
export class McpEventEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ nullable: true })
  repoId?: string;

  @Column({ nullable: true })
  jobId?: string;

  @Column()
  eventType!: string;

  @Column({ type: 'jsonb', nullable: true })
  payload?: any;

  @Column({ type: 'varchar', length: 32, default: 'pending' })
  status!: McpEventStatus;

  @Column({ type: 'integer', default: 0 })
  attempts!: number;

  @Column({ type: 'timestamp with time zone', nullable: true })
  lastAttemptAt?: Date;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;
}
