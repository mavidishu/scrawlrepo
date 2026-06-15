import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const mcpEnabled = this.configService.get<string>('MCP_ENABLED');
    if (!mcpEnabled || mcpEnabled === 'false') {
      // MCP disabled: allow through so existing APIs continue to function
      return true;
    }

    const req = context.switchToHttp().getRequest();
    const auth = (req.headers?.authorization || '') as string;
    if (!auth) {
      throw new UnauthorizedException('Missing Authorization header');
    }

    const match = auth.match(/^Bearer (.+)$/);
    if (!match) {
      throw new UnauthorizedException('Invalid Authorization header');
    }

    const token = match[1];
    const expected = this.configService.get<string>('MCP_API_KEY');
    if (!expected) {
      throw new UnauthorizedException('MCP API Key not configured');
    }

    // Security fix: use constant-time comparison via crypto.timingSafeEqual to prevent
    // timing attacks that could otherwise leak the expected API key byte-by-byte.
    const tokenBuf = Buffer.from(token);
    const expectedBuf = Buffer.from(expected);
    const isValid = tokenBuf.length === expectedBuf.length && crypto.timingSafeEqual(tokenBuf, expectedBuf);
    if (!isValid) {
      throw new UnauthorizedException('Invalid API key');
    }

    // Attach simple apiKey info to request for downstream use
    req.apiKey = { id: 'env', scopes: (this.configService.get<string>('MCP_API_SCOPES') || 'index,query').split(',') };

    return true;
  }
}
