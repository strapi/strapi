// @parity-settings: strict
// Strict-off parity for the root config, with the `strict` compiler option only: these diagnostics
// depend on it (a `T` return checked against `undefined`).
import type { Core } from '@strapi/strapi';

declare const app: Core.Strapi;

// Config mocks must return `T`.
// @ts-expect-error TS2322 `undefined` is not `T`
app.config.get = () => undefined;
// @ts-expect-error TS2322 `undefined` is not `T`
const configMock: Core.ConfigProvider['get'] = () => undefined;

export { configMock };
