import z from 'zod';

import { orPlaceholder } from '../../placeholder';
import { HttpsUrlSchema } from '../../url';

export const enum AuthType {
  Basic = 'basic',
  Bearer = 'bearer',
  OAuth2ClientCredentials = 'oauth2_client_credentials',
}

export const CLIENT_AUTH_METHODS = ['post', 'basic'] as const;

const BasicAuthConfigSchema = z.object({
  type: z.literal(AuthType.Basic),
  username: z.string().min(1),
  password: z.string().min(1).nullable().optional(),
});

const BearerAuthConfigSchema = z.object({
  type: z.literal(AuthType.Bearer),
  // a header value carries nothing but visible ASCII, and the
  // backend refuses anything else
  token: z
    .string()
    .min(1)
    .regex(/^[\u0021-\u007E]+$/, 'Token must be visible ASCII characters'),
});

const OAuth2ClientCredentialsAuthConfigSchema = z.object({
  type: z.literal(AuthType.OAuth2ClientCredentials),
  // the backend refuses a plaintext token endpoint, since the client
  // secret travels the request to it
  token_url: orPlaceholder(HttpsUrlSchema),
  client_id: z.string().min(1),
  client_secret: z.string().min(1),
  client_auth_method: orPlaceholder(z.enum(CLIENT_AUTH_METHODS)).optional(),
  scopes: z.array(z.string()).optional(),
  audience: z.string().min(1).nullable().optional(),
  resource: z.string().min(1).nullable().optional(),
  extra_params: z.record(z.string(), z.string()).optional(),
});

export const HTTPAuthConfigSchema = z.discriminatedUnion('type', [
  BasicAuthConfigSchema,
  BearerAuthConfigSchema,
  OAuth2ClientCredentialsAuthConfigSchema,
]);
export type HTTPAuthConfig = z.infer<typeof HTTPAuthConfigSchema>;
