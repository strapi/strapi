import type { Core } from '@strapi/strapi';

declare const app: Core.Strapi;
declare const name: string;

// Strict mode with no registered contracts, as a package sees it when it builds before the packages
// it loads contracts from: template expressions still match the UID patterns.
app.service(`api::${name}.${name}`) satisfies unknown;
app.controller(`admin::${name}`) satisfies unknown;
app.service<{ find(): void }>(`api::${name}.${name}`).find();
app.controller<Core.Controller>(`admin::${name}`) satisfies Core.Controller;
app.controller<Core.Controller>(`plugin::${name}.${name}`) satisfies Core.Controller;
