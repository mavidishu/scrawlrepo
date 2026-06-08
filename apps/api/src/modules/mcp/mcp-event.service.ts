import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { McpEventEntity } from '../../entities/mcp-event.entity';

@Injectable()
export class McpEventService {
  private readonly logger = new Logger(McpEventService.name);

  constructor(
    @InjectRepository(McpEventEntity)
    private readonly repo: Repository<McpEventEntity>,
  ) {}

  async logEvent(eventType: string, opts: { repoId?: string; jobId?: string; payload?: any } = {}) {
    const ent = this.repo.create({
      eventType,
      repoId: opts.repoId,
      jobId: opts.jobId,
      payload: opts.payload || {},
      status: 'pending' as const,
      attempts: 0,
    });

    const saved = await this.repo.save(ent);

    // Attempt immediate delivery (best-effort)
    this.attemptDelivery(saved).catch((err) => {
      this.logger.warn(`Initial delivery failed for event ${saved.id}: ${err?.message || err}`);
    });

    return saved;
  }

  private async attemptDelivery(event: McpEventEntity) {
    const webhookUrl = process.env.MCP_WEBHOOK_URL;
    if (!webhookUrl) {
      this.logger.debug('MCP_WEBHOOK_URL not configured, skipping delivery');
      return;
    }

    const maxAttempts = parseInt(process.env.MCP_WEBHOOK_RETRY_MAX || '3', 10);

    try {
      // perform HTTP POST
      const body = {
        id: event.id,
        repo_id: event.repoId,
        job_id: event.jobId,
        type: event.eventType,
        payload: event.payload,
        created_at: event.createdAt,
      };

      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      event.status = 'delivered';
      event.attempts = (event.attempts || 0) + 1;
      event.lastAttemptAt = new Date();
      await this.repo.save(event);
      this.logger.log(`Delivered MCP event ${event.id} to ${webhookUrl}`);
    } catch (err) {
      event.attempts = (event.attempts || 0) + 1;
      event.lastAttemptAt = new Date();
      if (event.attempts >= maxAttempts) {
        event.status = 'failed';
      }
      await this.repo.save(event);
      this.logger.warn(`Delivery attempt ${event.attempts} failed for event ${event.id}: ${err?.message || err}`);
      // Note: Background retries/dispatcher can pick up failed/pending events later.
    }
  }
}
