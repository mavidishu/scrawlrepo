import { IsString, IsOptional, IsInt, Min, Max, MinLength, MaxLength, IsUUID } from 'class-validator';

export class QueryDto {
  @IsString()
  @MinLength(3, { message: 'Question must be at least 3 characters' })
  @MaxLength(1000, { message: 'Question must be less than 1000 characters' })
  question: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  maxChunks?: number = 10;

  @IsOptional()
  @IsUUID()
  sessionId?: string;
}
