export interface Config {
  validator: () => unknown;
  default: object | (() => object);
}
