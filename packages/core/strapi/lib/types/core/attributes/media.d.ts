import type { Attribute } from '@strapi/strapi';

export type AllowedMediaTypes = 'images' | 'videos' | 'files' | 'audios';

export interface MediaProperties<
  // Media Type
  T extends AllowedMediaTypes | undefined = undefined,
  // Multiple
  U extends boolean = false
> {
  allowedTypes?: T;
  multiple?: U;
}

export type Media<
  // Media Type
  T extends AllowedMediaTypes | undefined = undefined,
  // Multiple
  U extends boolean = false
> = Attribute.OfType<'media'> &
  // Properties
  MediaProperties<T, U> &
  // Options
  Attribute.ConfigurableOption &
  Attribute.RequiredOption &
  Attribute.PrivateOption;

export type MediaValue<T extends boolean = false> = T extends true ? any[] : any;

export type GetMediaValue<T extends Attribute.Attribute> = T extends Media<infer _U, infer S>
  ? MediaValue<S>
  : never;
