import { Attribute } from './base';

export interface TimeAttribute extends Attribute<'time'> {}

export type TimeValue = string;

export type GetTimeAttributeValue<T extends Attibute> = T extends TimeAttribute ? TimeValue : never;
