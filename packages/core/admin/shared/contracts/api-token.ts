export * from './content-api-token';
export type { AdminApiToken, AdminTokenBody } from './admin-token';

import type { ContentApiApiToken, ContentApiApiTokenBody } from './content-api-token';
import type { AdminApiToken, AdminTokenBody } from './admin-token';

export type ApiToken = ContentApiApiToken | AdminApiToken;
export type ApiTokenBody = ContentApiApiTokenBody | AdminTokenBody;
