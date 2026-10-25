import { z } from "zod";

export const profileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, { message: "displayName" })
    .max(80, { message: "displayName" }),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9_]{3,30}$/, {
      message: "username",
    }),
  bio: z.string().trim().max(500, { message: "bio" }),
});
