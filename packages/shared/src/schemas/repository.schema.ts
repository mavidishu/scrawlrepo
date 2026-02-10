import { z } from 'zod';

const GITHUB_URL_REGEX = /^https?:\/\/(www\.)?github\.com\/[\w.-]+\/[\w.-]+\/?$/;

export const createRepositorySchema = z.object({
  githubUrl: z
    .string()
    .url('Must be a valid URL')
    .regex(GITHUB_URL_REGEX, 'Must be a valid GitHub repository URL'),
});

export const repositoryIdSchema = z.object({
  id: z.string().uuid('Invalid repository ID'),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type CreateRepositoryDto = z.infer<typeof createRepositorySchema>;
export type RepositoryIdDto = z.infer<typeof repositoryIdSchema>;
export type PaginationDto = z.infer<typeof paginationSchema>;
