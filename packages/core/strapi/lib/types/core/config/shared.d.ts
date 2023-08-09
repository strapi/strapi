export type ConfigFunction<TConfigObject = UnknownConfigObject> = ({ env }) => TConfigObject;

export type UnknownConfigObject = Record<string, unknown>;

export type ConfigExport<TConfigObject = UnknownConfigObject> =
  | ConfigFunction<TConfigObject>
  | TConfigObject;
