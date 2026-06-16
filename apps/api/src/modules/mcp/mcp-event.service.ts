import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { McpEventEntity } from '../../entities/mcp-event.entity';
import { EventEmitter } from 'events';

@Injectable()
export class McpEventService {
  private readonly logger = new Logger(McpEventService.name);
  private readonly emitter = new EventEmitter();

  constructor(
    @InjectRepository(McpEventEntity)
    private readonly repo: Repository<McpEventEntity>,
  ) {}

  getEmitter() {
    return this.emitter;
  }

  async logEvent(eventType: string, opts: { repoId?: string; jobId?: string; payload?: any } = {}) {
    // Build a transient event payload so SSE can receive progress even if DB is unavailable
    const transient = {
      repoId: opts.repoId,
      jobId: opts.jobId,
      eventType,
      payload: opts.payload || {},
      createdAt: new Date(),
    } as any;

    // Emit immediately for real-time subscribers
    try {
      this.emitter.emit('mcp.event', transient);
    } catch (err) {
      this.logger.warn(`Failed to emit transient MCP event: ${err?.message || err}`);
    }

    // Try to persist to DB; don't fail the caller if persistence is broken
    try {
      const ent = this.repo.create({
        eventType,
        repoId: opts.repoId,
        jobId: opts.jobId,
        payload: opts.payload || {},
        status: 'pending' as const,
        attempts: 0,
      });

      const saved = await this.repo.save(ent);

      // Emit the saved record (includes id/timestamps) for completeness
      try {
        this.emitter.emit('mcp.event', saved);
      } catch (err) {
        this.logger.warn(`Failed to emit saved MCP event: ${err?.message || err}`);
      }

      // Attempt immediate delivery (best-effort)
      this.attemptDelivery(saved).catch((err) => {
        this.logger.warn(`Initial delivery failed for event ${saved.id}: ${err?.message || err}`);
      });

      return saved;
    } catch (err) {
      this.logger.warn(`Failed to persist MCP event, emitting transient only: ${err?.message || err}`);
      return transient;
    }
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
