type Validator = unknown;

export interface ValidatorsRegistry {
  get(path: string): Validator[];
  add(path: string, validator: Validator): this;
  set(path: string, value?: Validator[]): this;
  has(path: string): boolean;
}
