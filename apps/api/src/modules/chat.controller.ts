import { Controller, Post, Get, Param, Body, ParseUUIDPipe, Query } from '@nestjs/common';
import { ChatService } from './chat.service';

@Controller('repos/:id/sessions')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  async create(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('name') name?: string
  ) {
    const session = await this.chatService.createSession(id, name);
    return { success: true, data: { sessionId: session.id } };
  }

  @Get()
  async list(@Param('id', ParseUUIDPipe) id: string) {
    const sessions = await this.chatService.listSessions(id);
    return { success: true, data: sessions };
  }

  @Get(':sid/messages')
  async getMessages(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('sid', ParseUUIDPipe) sid: string,
    @Query('limit') limit = '200'
  ) {
    const messages = await this.chatService.getMessages(sid, Number(limit));
    return { success: true, data: messages };
  }

  @Post(':sid/messages')
  async postMessage(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('sid', ParseUUIDPipe) sid: string,
    @Body() body: { role: string; content: string; metadata?: Record<string, unknown> }
  ) {
    const msg = await this.chatService.appendMessage(sid, body.role as any, body.content, body.metadata || {});
    return { success: true, data: msg };
  }
}
