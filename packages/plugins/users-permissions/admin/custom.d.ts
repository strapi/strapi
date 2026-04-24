/// <reference types="vite/client" />

declare global {
  interface Window {
    strapi: {
      backendURL: string;
    };
  }
}

export {};
