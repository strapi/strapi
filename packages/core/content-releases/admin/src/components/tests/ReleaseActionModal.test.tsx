import { renderHook } from '@strapi/admin/strapi-admin/test';

import { ReleaseActionModalForm } from '../ReleaseActionModal';

import type { DocumentActionProps } from '@strapi/content-manager/strapi-admin';

jest.mock('@strapi/admin/strapi-admin', () => ({
  ...jest.requireActual('@strapi/admin/strapi-admin'),
  useRBAC: jest.fn(() => ({ isLoading: false, allowedActions: { canCreateAction: true } })),
}));

jest.mock('@strapi/content-manager/strapi-admin', () => ({
  unstable_useDocumentLayout: jest.fn(() => ({ edit: { options: { draftAndPublish: true } } })),
}));

const props = {
  model: 'api::article.article',
  documentId: 'abc',
  document: { documentId: 'abc', id: 1 },
  collectionType: 'collection-types',
} as unknown as DocumentActionProps;

describe('ReleaseActionModalForm', () => {
  const originalIsEnabled = window.strapi.features.isEnabled;
  const originalIsEE = window.strapi.isEE;

  beforeEach(() => {
    window.strapi.isEE = true;
  });

  afterEach(() => {
    window.strapi.isEE = originalIsEE;
    window.strapi.features.isEnabled = originalIsEnabled;
  });

  it('offers "Add to release" with the cms-content-releases feature', () => {
    window.strapi.features.isEnabled = (name) => name === 'cms-content-releases';

    const { result } = renderHook(() => ReleaseActionModalForm(props));

    expect(result.current).toMatchObject({ label: 'Add to release' });
  });

  it('offers nothing when the license lacks the cms-content-releases feature', () => {
    window.strapi.features.isEnabled = () => false;

    const { result } = renderHook(() => ReleaseActionModalForm(props));

    expect(result.current).toBeNull();
  });
});
