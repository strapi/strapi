import { Strapi } from "./strapi";

export * from "./container";
export * from "./configuration";
export * from "./models";

export { Strapi };

declare global {
  const strapi: Strapi;
}
