import { beforeEach, describe, expect, it, vi } from 'vitest';
import { queryParams, errors } from '@strapi/utils';
import type { Struct, UID } from '@strapi/types';

import { createLocalizationService } from '../../localization';
import { createContentTypeRepository } from '../repository';

const ORGANIZATION_UID: UID.ContentType = 'api::organization.organization';
const COMPANY_UID: UID.ContentType = 'api::company.company';

const organizationModel: Struct.CollectionTypeSchema = {
  uid: ORGANIZATION_UID,
  kind: 'collectionType',
  collectionName: 'organizations',
  modelName: 'organization',
  modelType: 'contentType',
  globalId: 'Organization',
  info: {
    displayName: 'Organization',
    singularName: 'organization',
    pluralName: 'organizations',
  },
  options: {
    draftAndPublish: false,
  },
  attributes: {
    name: { type: 'string' },
    status: {
      type: 'enumeration',
      enum: ['active', 'suspended'],
      default: 'active',
      private: true,
    },
    parent: {
      type: 'relation',
      relation: 'manyToOne',
      target: ORGANIZATION_UID,
    },
  },
};

const companyModel: Struct.CollectionTypeSchema = {
  uid: COMPANY_UID,
  kind: 'collectionType',
  collectionName: 'companies',
  modelName: 'company',
  modelType: 'contentType',
  globalId: 'Company',
  info: {
    displayName: 'Company',
    singularName: 'company',
    pluralName: 'companies',
  },
  options: {
    draftAndPublish: false,
  },
  attributes: {
    name: { type: 'string' },
    secretNote: { type: 'string', private: true },
    organization: {
      type: 'relation',
      relation: 'manyToOne',
      target: ORGANIZATION_UID,
    },
  },
};

const models: Record<string, Struct.CollectionTypeSchema> = {
  [ORGANIZATION_UID]: organizationModel,
  [COMPANY_UID]: companyModel,
};

describe('Document Service: repository parameter validation', () => {
  const dbFindOne = vi.fn(async () => null);
  const dbFindMany = vi.fn(async () => []);

  beforeEach(() => {
    vi.clearAllMocks();

    const queryParamsTransformer = queryParams.createTransformer({
      getModel: (uid: string) => models[uid] as any,
    });

    global.strapi = {
      contentType: vi.fn((uid: UID.ContentType) => models[uid]),
      getModel: vi.fn((uid: UID.Schema) => models[uid]),
      get: vi.fn((name: string) => {
        if (name === 'query-params') {
          return { transform: queryParamsTransformer.transformQueryParams };
        }
        return undefined;
      }),
      plugins: {},
      localization: createLocalizationService(),
      config: { get: vi.fn(() => undefined) },
      db: {
        inTransaction: vi.fn(() => false),
        transaction: vi.fn(async (cb: () => unknown) => cb()),
        query: vi.fn(() => ({
          findOne: dbFindOne,
          findMany: dbFindMany,
        })),
      },
    } as any;
  });

  it('allows private scalar attributes in nested populate fields', async () => {
    const repository = createContentTypeRepository(COMPANY_UID);

    await repository.findOne({
      documentId: 'company-doc-id',
      fields: ['name', 'secretNote'],
      populate: {
        organization: {
          fields: ['documentId', 'status'],
        },
      },
    });

    expect(dbFindOne).toHaveBeenCalledTimes(1);
    expect(dbFindOne).toHaveBeenCalledWith(
      expect.objectContaining({
        select: ['id', 'documentId', 'name', 'secretNote'],
        populate: {
          organization: {
            select: ['id', 'documentId', 'status'],
          },
        },
        where: {
          documentId: 'company-doc-id',
        },
      })
    );
  });

  it('rejects non-scalar attributes in nested populate fields', async () => {
    const repository = createContentTypeRepository(COMPANY_UID);

    await expect(
      repository.findMany({
        populate: {
          organization: {
            fields: ['parent'] as any,
          },
        },
      })
    ).rejects.toThrow(errors.ValidationError);

    expect(dbFindMany).not.toHaveBeenCalled();
  });
});
