import { IsString, IsUrl, Matches } from 'class-validator';

export class CreateRepoDto {
  @IsString()
  @IsUrl()
  @Matches(/^https?:\/\/(www\.)?github\.com\/[\w.-]+\/[\w.-]+\/?$/, {
    message: 'Must be a valid GitHub repository URL',
  })
  githubUrl: string;
}
