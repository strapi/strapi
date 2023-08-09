type ConfigFunction<TConfigObject = UnknownConfigObject> = ({ env }) => TConfigObject;

type UnknownConfigObject = Record<string, unknown>;

type ConfigExport<TConfigObject = UnknownConfigObject> =
  | ConfigFunction<TConfigObject>
  | TConfigObject;
