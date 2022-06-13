import { Attribute } from './base';

export type AllowedMediaTypes = 'images' | 'videos' | 'files' | 'audios';

export interface MediaAttribute<T extends AllowedMediaTypes = undefined>
  extends Attribute<'media'> {
  multiple?: boolean;
  allowedTypes?: T;
}

// TODO: Add scalar value for media type
export type MediaValue = any;

export type GetMediaAttributeValue<T extends Attribute> = T extends MediaAttribute
  ? MediaValue
  : never;
