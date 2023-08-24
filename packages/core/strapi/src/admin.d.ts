declare module '@strapi/admin';
declare module 'koa-favicon' {
  export default function favicon(
    path: string,
    options?: { maxAge?: number; mime?: string }
  ): Koa.Middleware;
}
