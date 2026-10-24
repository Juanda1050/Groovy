import { z } from "zod";

export const profileSchema = z.object({
  displayName: z.string().trim().min(1).max(80),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9_]{3,30}$/),
  bio: z.string().trim().max(500),
});
