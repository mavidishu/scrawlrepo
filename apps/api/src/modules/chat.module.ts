import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatSessionEntity } from '../entities/chat-session.entity';
import { ChatMessageEntity } from '../entities/chat-message.entity';
import { RepositoryEntity } from '../entities/repository.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([ChatSessionEntity, ChatMessageEntity, RepositoryEntity]),
  ],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
