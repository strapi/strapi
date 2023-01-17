import { Attribute, ConfigurableOption, PrivateOption, RequiredOption } from './base';
import { JSON } from './common';

export type JSONAttribute = Attribute<'json'> &
  //Options
  ConfigurableOption &
  RequiredOption &
  PrivateOption;

export type JsonValue = JSON;

export type GetJsonAttributeValue<T extends Attribute> = T extends JSONAttribute
  ? JsonValue
  : never;
