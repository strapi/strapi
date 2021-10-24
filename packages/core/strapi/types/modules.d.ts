declare module 'delegates';
declare module '@strapi/generate-new';
declare module '@strapi/admin/strapi-server';
declare module '@strapi/utils/lib/convert-query-params';
declare module 'koa' {
  interface BaseResponse {
    send: (data: any, status?: number) => void;
    created: (data: any) => void;
    deleted: (data: any) => void;
  }
}

export {};
