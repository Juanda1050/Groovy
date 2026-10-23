import { z } from "zod";

export const signInSchema = z.object({
  email: z.email().max(254),
  password: z.string().min(1).max(128),
});

export const signUpSchema = signInSchema.extend({
  password: z.string().min(12).max(128),
});

export const verificationSchema = z.object({
  email: z.email().max(254),
  token: z.string().regex(/^\d{6,10}$/),
});
