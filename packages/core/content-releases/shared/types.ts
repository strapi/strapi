import type { Data } from '@strapi/types';

// @TODO: Probably user & role types should be imported from a common package
interface RoleInfo extends Omit<Entity, 'createdAt' | 'updatedAt'> {
  name: string;
  code: string;
  description?: string;
  usersCount?: number;
}

export interface UserInfo extends Entity {
  firstname: string;
  lastname?: string;
  username?: null | string;
  email: string;
  isActive: boolean;
  blocked: boolean;
  preferedLanguage: null | string;
  roles: RoleInfo[];
}

export interface Entity {
  id: Data.ID;
  createdAt: string;
  updatedAt: string;
}

/**
 * Utility type to enforce mutually exclusive properties.
 *
 * This type ensures that either properties of type {@link T} or properties of type {@link U} are present,
 * but never both at the same time. It is useful for defining states where you want to
 * have exactly one of two possible sets of properties.
 *
 * @template T - The first set of properties.
 * @template U - The second set of properties.
 *
 * @example
 * // Define a type where you either have data or an error, but not both:
 * type Response = OneOf<
 *   { data: Data },
 *   { error: ApplicationError | ValidationError }
 * >;
 *
 * // Is equivalent to:
 * type Response = { data: Data, error: never } | { data: never, error: ApplicationError | ValidationError };
 *
 */
export type OneOf<T, U> = (T & { [K in keyof U]?: never }) | (U & { [K in keyof T]?: never });
