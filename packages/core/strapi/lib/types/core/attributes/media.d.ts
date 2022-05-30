import { Attribute } from './base';

export interface MediaAttribute extends Attribute<'media'> {
  multiple?: boolean;
}

// TODO: Add scalar value for media type
export type MediaValue = any;

export type GetMediaAttributeValue<T extends Attribute> = T extends MediaAttribute
  ? MediaValue
  : never;
