export interface ServerConfig {
  validator: () => unknown;
  default: object | (() => object);
}
