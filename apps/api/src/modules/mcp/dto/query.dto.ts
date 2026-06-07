import { IsString, IsOptional } from 'class-validator';

export class QueryDto {
  @IsString()
  query: string;

  @IsOptional()
  options?: { top_k?: number };
}
