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

export const loginAgreementDocumentSchema = z.object({
  id: z.string(),
  title: z.string(),
  content_md: z.string(),
}).passthrough();

export type LoginAgreementDocument = z.infer<typeof loginAgreementDocumentSchema>;

export const publicSettingsSchema = z.object({
  registration_enabled: z.boolean().optional(),
  email_verify_enabled: z.boolean().optional(),
  password_reset_enabled: z.boolean().optional(),
  totp_enabled: z.boolean().optional(),
  login_agreement_enabled: z.boolean().optional(),
  login_agreement_mode: z.string().optional(),
  login_agreement_updated_at: z.string().optional(),
  login_agreement_revision: z.string().optional(),
  login_agreement_documents: z.array(loginAgreementDocumentSchema).optional(),
  turnstile_enabled: z.boolean().optional(),
  turnstile_site_key: z.string().optional(),
  aliyun_captcha_enabled: z.boolean().optional(),
  tencent_captcha_enabled: z.boolean().optional(),
  payment_enabled: z.boolean().optional(),
  site_name: z.string().optional(),
  site_subtitle: z.string().optional(),
  api_base_url: z.string().optional(),
  doc_url: z.string().optional(),
}).passthrough();

export type PublicSettings = z.infer<typeof publicSettingsSchema>;

export const authResponseSchema = z.object({
  // The first password-login response can require TOTP and therefore only
  // carries requires_2fa/temp_token. Final token responses still validate the
  // token at the service boundary before persisting a session.
  access_token: z.string().optional(),
  refresh_token: z.string().optional(),
  expires_in: z.number().optional(),
  token_type: z.string().optional(),
  user: userSchema.optional(),
  requires_2fa: z.boolean().optional(),
  temp_token: z.string().optional(),
  user_email_masked: z.string().optional(),
}).passthrough();

export type AuthResponse = z.infer<typeof authResponseSchema>;
