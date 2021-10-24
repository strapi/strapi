export interface AdminApiToken {}
export interface AdminPermission {}
export interface AdminRole {}
export interface AdminUser {}

declare module '@strapi/strapi' {
  interface StrapiContentTypes {
    'admin:api-token': AdminApiToken;
    'admin:permission': AdminPermission;
    'admin:role': AdminRole;
    'admin:user': AdminUser;
  }
}
