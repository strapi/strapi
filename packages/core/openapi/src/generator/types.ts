import { OpenAPIV3 } from 'openapi-types';

export interface GeneratorOutputOptions {
  validate?: boolean;
}

export interface GeneratorOptions {
  output: GeneratorOutputOptions;
}

export interface GeneratorOutput {
  document: OpenAPIV3.Document;
  durationMs: number;
}
