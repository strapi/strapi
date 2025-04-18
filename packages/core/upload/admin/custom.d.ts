export {};

declare global {
  interface Window {
    strapi: {
      backendURL: string;
    };
  }
  declare module '*?raw';
}
