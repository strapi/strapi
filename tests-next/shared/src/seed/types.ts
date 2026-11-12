/**
 * A seed plan: what to create, as plain JSON. The test plugin applies it in this order
 * (tests-next/shared/test-plugin/lib/seed.js), so later steps can use what earlier ones created.
 */
export interface SeedPlan {
  /** i18n locales. `isDefault` makes the locale the default one. */
  locales?: Array<{ code: string; name?: string; isDefault?: boolean }>;
  /** Admin roles, with their permissions (`subject` is a content type uid). */
  adminRoles?: Array<{
    name: string;
    code?: string;
    description?: string;
    permissions?: AdminPermission[];
  }>;
  /** Admin users. `roles` are role codes: `strapi-super-admin`, `strapi-editor`, `strapi-author`… */
  adminUsers?: Array<{
    email: string;
    password: string;
    firstname: string;
    lastname: string;
    roles: string[];
  }>;
  /** Users & Permissions end users. `role` is a role type, `authenticated` by default. */
  users?: Array<{
    username: string;
    email: string;
    password: string;
    role?: string;
    confirmed?: boolean;
  }>;
  /** Files uploaded to the Media Library. `file` is an absolute path on this machine. */
  media?: Array<{ file: string; name?: string; alternativeText?: string; caption?: string }>;
  /** Documents, created through the Document Service. The content type must be scaffolded. */
  entries?: Array<{
    uid: string;
    data: Record<string, unknown>;
    locale?: string;
    status?: 'draft' | 'published';
  }>;
  /**
   * API tokens. `content-api` tokens are `full-access`, `read-only` or `custom` (with content API
   * actions). `admin` tokens need the `adminTokens` future flag, belong to an admin user
   * (`owner`, by email) and get admin permissions within that user's own.
   */
  apiTokens?: Array<
    | {
        kind?: 'content-api';
        name: string;
        description?: string;
        type?: 'full-access' | 'read-only' | 'custom';
        permissions?: string[];
      }
    | {
        kind: 'admin';
        name: string;
        description?: string;
        owner: string;
        permissions?: AdminPermission[];
      }
  >;
}

export interface AdminPermission {
  action: string;
  subject?: string | null;
  properties?: Record<string, unknown>;
  conditions?: string[];
}

/** What a seed created. */
export interface SeedResult {
  locales: Array<{ id: number; code: string }>;
  adminRoles: Array<{ id: number; name: string; code: string }>;
  adminUsers: Array<{ id: number; email: string }>;
  users: Array<{ id: number; email: string }>;
  media: Array<{ id: number; name: string; url: string }>;
  entries: Array<{ uid: string; id: number; documentId: string; locale?: string }>;
  apiTokens: Array<{ id: number; name: string; kind: 'content-api' | 'admin'; accessKey: string }>;
}
