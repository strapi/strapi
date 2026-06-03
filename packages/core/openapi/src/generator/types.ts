import type { OpenAPIV3_1 } from 'openapi-types';

export interface GeneratorOutputOptions {
  validate?: boolean;
}

export interface GeneratorOptions {
  output: GeneratorOutputOptions;
}

export interface GeneratorOutput {
  document: OpenAPIV3_1.Document;
  durationMs: number;
}
