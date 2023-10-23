export interface Container {
  register<T, U extends string>(name: U, resolver: T): Container;
  get<T = any>(name: string, args?: unknown): T;
  extend(): Container;
}
