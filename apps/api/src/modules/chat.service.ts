import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatSessionEntity } from '../entities/chat-session.entity';
import { ChatMessageEntity, ChatRole } from '../entities/chat-message.entity';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatSessionEntity)
    private readonly sessionRepository: Repository<ChatSessionEntity>,
    @InjectRepository(ChatMessageEntity)
    private readonly messageRepository: Repository<ChatMessageEntity>
  ) {}

  async createSession(repositoryId: string, name?: string, createdBy?: string) {
    const session = this.sessionRepository.create({
      repositoryId,
      name: name || null,
      createdBy: createdBy || null,
    } as Partial<ChatSessionEntity>);

    return this.sessionRepository.save(session);
  }

  async listSessions(repositoryId: string) {
    return this.sessionRepository.find({
      where: { repositoryId },
      order: { updatedAt: 'DESC' },
      take: 20,
    });
  }

  async getMessages(sessionId: string, limit = 200) {
    return this.messageRepository.find({
      where: { sessionId },
      order: { createdAt: 'ASC' },
      take: limit,
    });
  }

  async appendMessage(
    sessionId: string,
    role: ChatRole,
    content: string,
    metadata: Record<string, unknown> = {},
    tokensEstimate?: number
  ) {
    // ensure session exists
    const session = await this.sessionRepository.findOne({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Chat session not found');

    const msg = this.messageRepository.create({
      sessionId,
      role,
      content,
      metadata,
      tokensEstimate: tokensEstimate ?? null,
    } as Partial<ChatMessageEntity>);

    return this.messageRepository.save(msg);
  }
}
