import { StrapiCoreRegistries } from '../lib/core/registries/types';
import { StrapiInterface } from './strapi';
export interface Registry extends Record<string, Function | Promise> {}
export interface StrapiRegistries extends StrapiCoreRegistries {}

export type RegistryResolver<T extends Registry> = T | ((ctx: { strapi: Strapi }, args?: any) => T);

export interface StrapiRegistryContainer {
  register<K extends keyof StrapiRegistries, V extends Registry>(
    name: K,
    resolver: RegistryResolver<V>
  ): ThisType;
  get<K extends keyof StrapiRegistries>(name: K, args?: any): StrapiRegistries[K];
  extend(): void;
}
