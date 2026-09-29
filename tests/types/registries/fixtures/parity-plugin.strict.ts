// @parity-settings: strict
// Strict-off parity for `Core.Plugin`, with the `strict` compiler option only: these diagnostics
// depend on it (a `T` return checked against `undefined`).
import type { Core } from '@strapi/strapi';

declare const app: Core.Strapi;
declare const pluginMock: Core.Plugin;

// Config mocks must return `T`.
// @ts-expect-error TS2322 `undefined` is not `T`
app.plugin('parity').config = () => undefined;
// `config` comes from `Core.Module`, not from the plugin index signature.
// @ts-expect-error TS2322 `undefined` is not `T`
pluginMock.config = () => undefined;
