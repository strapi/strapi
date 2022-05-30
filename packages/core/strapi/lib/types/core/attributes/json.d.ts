import { Attribute } from './base';

export interface JsonAttribute extends Attribute<'json'> {}

export type JsonValue = {};

export type GetJsonAttributeValue<T extends Attribute> = T extends JsonAttribute ? JsonValue : never;
