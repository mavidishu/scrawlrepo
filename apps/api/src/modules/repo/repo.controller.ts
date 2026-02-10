import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { RepoService } from './repo.service';
import { CreateRepoDto, PaginationDto } from '../../dto';

@Controller('repos')
export class RepoController {
  constructor(private readonly repoService: RepoService) {}

  @Post()
  async create(@Body() createRepoDto: CreateRepoDto) {
    const repository = await this.repoService.create(createRepoDto);
    return {
      success: true,
      data: repository,
    };
  }

  @Get()
  async findAll(@Query() pagination: PaginationDto) {
    const result = await this.repoService.findAll(pagination);
    return {
      success: true,
      data: result,
    };
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const repository = await this.repoService.findOneWithStats(id);
    return {
      success: true,
      data: repository,
    };
  }

  @Get(':id/status')
  async getStatus(@Param('id', ParseUUIDPipe) id: string) {
    const status = await this.repoService.getStatus(id);
    return {
      success: true,
      data: status,
    };
  }

  @Post(':id/reindex')
  @HttpCode(HttpStatus.ACCEPTED)
  async reindex(@Param('id', ParseUUIDPipe) id: string) {
    await this.repoService.triggerReindex(id);
    return {
      success: true,
      message: 'Re-indexing started',
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.repoService.remove(id);
  }
}
