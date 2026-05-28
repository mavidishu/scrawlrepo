import { IsString, IsUrl, IsOptional } from 'class-validator';

export class IndexRepoDto {
  @IsString()
  @IsUrl()
  repo_url: string;

  @IsOptional()
  options?: { depth?: number; private?: boolean };
}
