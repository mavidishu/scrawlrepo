import { Controller, Post, Body, Param, ParseUUIDPipe } from '@nestjs/common';
import { AiService } from './ai.service';
import { QueryDto } from '../../dto';

@Controller('repos/:id')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('query')
  async query(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() queryDto: QueryDto
  ) {
    const result = await this.aiService.query(
      id,
      queryDto.question,
      queryDto.maxChunks
    );

    return {
      success: true,
      data: result,
    };
  }
}
