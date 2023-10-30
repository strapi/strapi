export {};

declare global {
  interface Window {
    strapi: {
      backendURL: string;
    };
  }
}
