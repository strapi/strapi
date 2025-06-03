import { env } from '@strapi/utils';

export type ConfigParams = {
  env: typeof env;
};

export type ConfigFunction<TConfigObject = UnknownConfigObject> = (
  params: ConfigParams
) => TConfigObject;

export type UnknownConfigObject = Record<string, unknown>;

export type ConfigExport<TConfigObject = UnknownConfigObject> =
  | ConfigFunction<TConfigObject>
  | TConfigObject;
