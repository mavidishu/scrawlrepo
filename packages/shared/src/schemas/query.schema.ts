import { z } from 'zod';

export const querySchema = z.object({
  question: z
    .string()
    .min(3, 'Question must be at least 3 characters')
    .max(1000, 'Question must be less than 1000 characters'),
  maxChunks: z.coerce.number().int().positive().max(20).default(10),
});

export type QueryDto = z.infer<typeof querySchema>;
