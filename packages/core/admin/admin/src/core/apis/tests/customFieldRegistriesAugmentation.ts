import type {} from '../CustomFields';

declare module '../CustomFields' {
  export interface CustomFieldOptionInputRegistry {
    'test-slider': true;
  }

  export interface CustomFieldOptionNameRegistry {
    'options.test-slider-label': true;
    // Intentionally invalid root-level key — must not widen CustomFieldOptionName.
    plop: true;
  }
}
