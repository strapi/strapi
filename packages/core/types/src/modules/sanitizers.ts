type Sanitizer = (value: unknown) => unknown;

export interface SanitizersRegistry {
  get(path: string): Sanitizer[];
  add(path: string, sanitizer: Sanitizer): this;
  set(path: string, value?: Sanitizer[]): this;
  has(path: string): boolean;
}
