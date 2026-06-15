import { Controller, Sse, MessageEvent, Param } from '@nestjs/common';
import { McpEventService } from './mcp-event.service';
import { Observable, fromEvent } from 'rxjs';
import { filter, map } from 'rxjs/operators';

@Controller('mcp/v1')
export class McpEventsController {
  constructor(private readonly mcpEventService: McpEventService) {}

  @Sse('repos/:id/events/stream')
  events(@Param('id') id: string): Observable<MessageEvent> {
    const emitter = this.mcpEventService.getEmitter();

    // Listen for in-process MCP events and stream only those matching repo id
    return fromEvent(emitter as any, 'mcp.event').pipe(
      filter((evt: any) => evt?.repoId === id),
      map((evt: any) => ({ data: evt }))
    );
  }
}
