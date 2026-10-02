import { z } from 'zod';

export const userSchema = z.object({
  id: z.coerce.number(),
  email: z.string().email(),
  username: z.string().nullable().optional(),
  role: z.string().optional(),
  status: z.string().optional(),
  balance: z.union([z.string(), z.number()]).nullable().optional(),
  email_verified: z.boolean().optional(),
}).passthrough();

export type AuthUser = z.infer<typeof userSchema>;

export const publicSettingsSchema = z.object({
  registration_enabled: z.boolean().optional(),
  email_verify_enabled: z.boolean().optional(),
  password_reset_enabled: z.boolean().optional(),
  totp_enabled: z.boolean().optional(),
  turnstile_enabled: z.boolean().optional(),
  turnstile_site_key: z.string().optional(),
  payment_enabled: z.boolean().optional(),
  site_name: z.string().optional(),
  site_subtitle: z.string().optional(),
  api_base_url: z.string().optional(),
  doc_url: z.string().optional(),
}).passthrough();

export type PublicSettings = z.infer<typeof publicSettingsSchema>;

export const authResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string().optional(),
  expires_in: z.number().optional(),
  token_type: z.string().optional(),
  user: userSchema.optional(),
  requires_2fa: z.boolean().optional(),
  temp_token: z.string().optional(),
  user_email_masked: z.string().optional(),
}).passthrough();

export type AuthResponse = z.infer<typeof authResponseSchema>;
