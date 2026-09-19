/**
 * Type-level fixture compiled with `exactOptionalPropertyTypes: true`.
 *
 * The repository default is `exactOptionalPropertyTypes: false`, under which `p?: T` and
 * `p?: T | undefined` are indistinguishable — meaning the regression this file guards against is
 * invisible in the regular `test:ts` program. It therefore has its own tsconfig
 * (`tests/tsconfig.json`) that turns the flag on.
 *
 * What it asserts:
 *
 *  - optional **input** properties accept an explicit `undefined` (an absent key and an explicitly
 *    `undefined` one are handled identically by the runtime — `processData` in `@strapi/database`
 *    iterates the schema attributes and skips anything failing `isUndefined`);
 *  - `null` keeps meaning "write NULL" and is still rejected where the schema does not allow it;
 *  - required attributes are still required, and still reject `undefined`.
 *
 * This file is type-checked only; nothing is executed.
 */

/* eslint-disable no-void -- `void` marks the calls as type-checked-only, never awaited */

import type { Modules, Schema, Struct } from '../src';

/* -------------------------------------------------------------------------------------------------
 * Fixture schemas
 * ---------------------------------------------------------------------------------------------- */

interface AddressComponent extends Struct.ComponentSchema {
  collectionName: 'components_default_addresses';
  category: 'default';
  info: { displayName: 'Address' };
  attributes: {
    street: Schema.Attribute.String & Schema.Attribute.Required;
    zipCode: Schema.Attribute.String;
  };
}

interface Organization extends Struct.CollectionTypeSchema {
  collectionName: 'organizations';
  info: { singularName: 'organization'; pluralName: 'organizations'; displayName: 'Organization' };
  attributes: {
    name: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

interface Invoice extends Struct.CollectionTypeSchema {
  collectionName: 'invoices';
  info: { singularName: 'invoice'; pluralName: 'invoices'; displayName: 'Invoice' };
  attributes: {
    // Required scalar
    amount: Schema.Attribute.Decimal & Schema.Attribute.Required;
    // Optional scalars
    description: Schema.Attribute.Text;
    issuedByUserId: Schema.Attribute.Integer;
    // Optional xToOne relation
    organization: Schema.Attribute.Relation<'oneToOne', 'api::organization.organization'>;
    // Optional component
    billingAddress: Schema.Attribute.Component<'default.address', false>;
    // Optional JSON column
    metadata: Schema.Attribute.JSON;
  };
}

declare module '../src/public/registries' {
  export interface ContentTypeSchemas {
    'api::invoice.invoice': Invoice;
    'api::organization.organization': Organization;
  }

  export interface ComponentSchemas {
    'default.address': AddressComponent;
  }
}

/* -------------------------------------------------------------------------------------------------
 * The caller's own domain type — the shape that triggered the bug
 * ---------------------------------------------------------------------------------------------- */

type IssueInvoiceCommand = {
  organizationDocumentId: string;
  amount: number;
  description?: string;
  issuedByUserId?: number;
  metadata?: Record<string, string>;
};

declare const command: IssueInvoiceCommand;
declare const documents: Modules.Documents.ServiceInstance<'api::invoice.invoice'>;

/* -------------------------------------------------------------------------------------------------
 * create() — explicit `undefined` on optional properties
 * ---------------------------------------------------------------------------------------------- */

// Every optional field is forwarded as `T | undefined` straight from the caller's own optional
// properties, without conditional spreads or an undefined-stripping helper.
void documents.create({
  data: {
    amount: command.amount,
    description: command.description,
    issuedByUserId: command.issuedByUserId,
    metadata: command.metadata,
    organization: { documentId: command.organizationDocumentId },
    billingAddress: undefined,
  },
});

// Explicit `undefined` on the relation and the component too.
void documents.create({
  data: {
    amount: 1,
    organization: undefined,
    billingAddress: undefined,
    description: undefined,
    metadata: undefined,
  },
});

// `id` / `documentId` are optional input properties as well.
void documents.create({
  data: {
    amount: 1,
    id: undefined,
    documentId: undefined,
  },
});

// Optional properties of the relation long-hand notation.
void documents.create({
  data: {
    amount: 1,
    organization: { documentId: 'abc', locale: undefined },
  },
});

// Component input reuses the same machinery: optional member accepts `undefined`, required does not.
void documents.create({
  data: {
    amount: 1,
    billingAddress: { street: 'Main street', zipCode: undefined },
  },
});

/* -------------------------------------------------------------------------------------------------
 * `null` still means "write NULL" and is not interchangeable with `undefined`
 * ---------------------------------------------------------------------------------------------- */

// Relations explicitly accept `null` (clear the relation).
void documents.create({
  data: {
    amount: 1,
    organization: null,
  },
});

// A nullable JSON column accepts `null`.
void documents.create({
  data: {
    amount: 1,
    metadata: null,
  },
});

// A non-nullable scalar does not silently gain `null` from this change.
void documents.create({
  data: {
    amount: 1,
    // @ts-expect-error `null` is not a valid value for a text attribute
    description: null,
  },
});

/* -------------------------------------------------------------------------------------------------
 * Required attributes stay required — the `-?` branch of GetValues is untouched
 * ---------------------------------------------------------------------------------------------- */

// @ts-expect-error `amount` is required and missing
void documents.create({ data: { description: 'no amount' } });

void documents.create({
  data: {
    // @ts-expect-error `amount` is required and cannot be explicitly undefined
    amount: undefined,
  },
});

void documents.create({
  data: {
    amount: 1,
    // @ts-expect-error `street` is required on the component and cannot be explicitly undefined
    billingAddress: { street: undefined },
  },
});

/* -------------------------------------------------------------------------------------------------
 * update() — the `data:partial` fragment goes through PartialWithUndefined
 * ---------------------------------------------------------------------------------------------- */

void documents.update({
  documentId: 'abc',
  data: {
    amount: command.amount,
    description: command.description,
    issuedByUserId: command.issuedByUserId,
    organization: undefined,
  },
});

// Every property is optional on update, including the ones that are required on create.
void documents.update({
  documentId: 'abc',
  data: { amount: undefined },
});

/* -------------------------------------------------------------------------------------------------
 * Top-level method params — `{ data, populate: maybePopulate }` hits the same wall
 * ---------------------------------------------------------------------------------------------- */

declare const maybeLocale: string | undefined;
declare const maybeStatus: 'draft' | 'published' | undefined;
declare const maybeFields: ['description'] | undefined;
declare const maybePopulate: ['organization'] | undefined;
declare const maybeSearch: string | undefined;
declare const maybeLimit: number | undefined;

void documents.create({
  data: { amount: 1 },
  locale: maybeLocale,
  status: maybeStatus,
  fields: maybeFields,
  populate: maybePopulate,
});

void documents.findMany({
  locale: maybeLocale,
  status: maybeStatus,
  fields: maybeFields,
  populate: maybePopulate,
  _q: maybeSearch,
  limit: maybeLimit,
  sort: undefined,
  filters: undefined,
});

void documents.findOne({
  documentId: 'abc',
  locale: maybeLocale,
  status: maybeStatus,
  fields: maybeFields,
  populate: maybePopulate,
});
