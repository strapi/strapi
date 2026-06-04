/// <reference types="@strapi/types/globals-server" />

declare module '*.html' {
  const content: string;
  export default content;
}
