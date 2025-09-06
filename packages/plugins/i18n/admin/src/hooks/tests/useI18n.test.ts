import { useAuth } from '@strapi/admin/strapi-admin';
import { unstable_useDocument as useDocument } from '@strapi/content-manager/strapi-admin';
import { renderHook } from '@testing-library/react';
import { useParams } from 'react-router-dom';

import { useI18n } from '../useI18n';

jest.mock('react-router-dom', () => ({
  useParams: jest.fn(),
}));

jest.mock('@strapi/admin/strapi-admin', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@strapi/content-manager/strapi-admin', () => ({
  unstable_useDocument: jest.fn(),
}));

const mockUseParams = useParams as jest.MockedFunction<typeof useParams>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseDocument = useDocument as jest.MockedFunction<typeof useDocument>;

describe('useI18n', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return hasI18n: false when schema does not have i18n localized', () => {
    const mockParams = {
      collectionType: 'collection-types',
      slug: 'article',
      model: 'article',
    };

    const mockPermissions = [
      {
        action: 'plugin::content-manager.explorer.create',
        subject: 'article',
        properties: { locales: ['en', 'fr'] },
      },
    ];

    const mockSchema = {
      pluginOptions: {
        other: true,
      },
    };

    mockUseParams.mockReturnValue(mockParams);
    mockUseAuth.mockReturnValue(mockPermissions);
    mockUseDocument.mockReturnValue({
      schema: mockSchema,
    } as unknown as ReturnType<typeof useDocument>);

    const { result } = renderHook(() => useI18n());

    expect(result.current.hasI18n).toBe(false);
    expect(result.current.canCreate).toEqual(['en', 'fr']);
    expect(result.current.canRead).toEqual([]);
    expect(result.current.canUpdate).toEqual([]);
    expect(result.current.canDelete).toEqual([]);
    expect(result.current.canPublish).toEqual([]);
  });

  it('should return hasI18n: true when schema has i18n localized', () => {
    const mockParams = {
      collectionType: 'collection-types',
      slug: 'article',
      model: 'article',
    };

    const mockPermissions = [
      {
        action: 'plugin::content-manager.explorer.read',
        subject: 'article',
        properties: { locales: ['en', 'fr', 'de'] },
      },
    ];

    const mockSchema = {
      pluginOptions: {
        i18n: {
          localized: true,
        },
      },
    };

    mockUseParams.mockReturnValue(mockParams);
    mockUseAuth.mockReturnValue(mockPermissions);
    mockUseDocument.mockReturnValue({
      schema: mockSchema,
    } as unknown as ReturnType<typeof useDocument>);

    const { result } = renderHook(() => useI18n());

    expect(result.current.hasI18n).toBe(true);
    expect(result.current.canRead).toEqual(['en', 'fr', 'de']);
    expect(result.current.canCreate).toEqual([]);
    expect(result.current.canUpdate).toEqual([]);
    expect(result.current.canDelete).toEqual([]);
    expect(result.current.canPublish).toEqual([]);
  });

  it('should aggregate permissions from multiple actions correctly', () => {
    const mockParams = {
      collectionType: 'collection-types',
      slug: 'article',
      model: 'article',
    };

    const mockPermissions = [
      {
        action: 'plugin::content-manager.explorer.create',
        subject: 'article',
        properties: { locales: ['en', 'fr'] },
      },
      {
        action: 'plugin::content-manager.explorer.update',
        subject: 'article',
        properties: { locales: ['en', 'de'] },
      },
      {
        action: 'plugin::content-manager.explorer.delete',
        subject: 'article',
        properties: { locales: ['fr', 'de', 'es'] },
      },
    ];

    const mockSchema = {
      pluginOptions: {
        i18n: {
          localized: true,
        },
      },
    };

    mockUseParams.mockReturnValue(mockParams);
    mockUseAuth.mockReturnValue(mockPermissions);
    mockUseDocument.mockReturnValue({
      schema: mockSchema,
    } as unknown as ReturnType<typeof useDocument>);

    const { result } = renderHook(() => useI18n());

    expect(result.current.hasI18n).toBe(true);
    expect(result.current.canCreate).toEqual(['en', 'fr']);
    expect(result.current.canUpdate).toEqual(['en', 'de']);
    expect(result.current.canDelete).toEqual(['fr', 'de', 'es']);
    expect(result.current.canRead).toEqual([]);
    expect(result.current.canPublish).toEqual([]);
  });

  it('should handle permissions without locales property', () => {
    const mockParams = {
      collectionType: 'collection-types',
      slug: 'article',
      model: 'article',
    };

    const mockPermissions = [
      {
        action: 'plugin::content-manager.explorer.create',
        subject: 'article',
        properties: {},
      },
      {
        action: 'plugin::content-manager.explorer.read',
        subject: 'article',
      },
    ];

    const mockSchema = {
      pluginOptions: {
        i18n: {
          localized: true,
        },
      },
    };

    mockUseParams.mockReturnValue(mockParams);
    mockUseAuth.mockReturnValue(mockPermissions);
    mockUseDocument.mockReturnValue({
      schema: mockSchema,
    } as unknown as ReturnType<typeof useDocument>);

    const { result } = renderHook(() => useI18n());

    expect(result.current.hasI18n).toBe(true);
    expect(result.current.canCreate).toEqual([]);
    expect(result.current.canRead).toEqual([]);
    expect(result.current.canUpdate).toEqual([]);
    expect(result.current.canDelete).toEqual([]);
    expect(result.current.canPublish).toEqual([]);
  });

  it('should filter permissions by subject (slug)', () => {
    const mockParams = {
      collectionType: 'collection-types',
      slug: 'article',
      model: 'article',
    };

    const mockPermissions = [
      {
        action: 'plugin::content-manager.explorer.create',
        subject: 'article',
        properties: { locales: ['en', 'fr'] },
      },
      {
        action: 'plugin::content-manager.explorer.create',
        subject: 'category',
        properties: { locales: ['de', 'es'] },
      },
    ];

    const mockSchema = {
      pluginOptions: {
        i18n: {
          localized: true,
        },
      },
    };

    mockUseParams.mockReturnValue(mockParams);
    mockUseAuth.mockReturnValue(mockPermissions);
    mockUseDocument.mockReturnValue({
      schema: mockSchema,
    } as unknown as ReturnType<typeof useDocument>);

    const { result } = renderHook(() => useI18n());

    expect(result.current.hasI18n).toBe(true);
    expect(result.current.canCreate).toEqual(['en', 'fr']);
    expect(result.current.canRead).toEqual([]);
    expect(result.current.canUpdate).toEqual([]);
    expect(result.current.canDelete).toEqual([]);
    expect(result.current.canPublish).toEqual([]);
  });

  it('should handle duplicate locales in permissions by using union', () => {
    const mockParams = {
      collectionType: 'collection-types',
      slug: 'article',
      model: 'article',
    };

    const mockPermissions = [
      {
        action: 'plugin::content-manager.explorer.create',
        subject: 'article',
        properties: { locales: ['en', 'fr'] },
      },
      {
        action: 'plugin::content-manager.explorer.create',
        subject: 'article',
        properties: { locales: ['fr', 'de'] },
      },
    ];

    const mockSchema = {
      pluginOptions: {
        i18n: {
          localized: true,
        },
      },
    };

    mockUseParams.mockReturnValue(mockParams);
    mockUseAuth.mockReturnValue(mockPermissions);
    mockUseDocument.mockReturnValue({
      schema: mockSchema,
    } as unknown as ReturnType<typeof useDocument>);

    const { result } = renderHook(() => useI18n());

    expect(result.current.hasI18n).toBe(true);
    expect(result.current.canCreate).toEqual(['en', 'fr', 'de']);
    expect(result.current.canRead).toEqual([]);
    expect(result.current.canUpdate).toEqual([]);
    expect(result.current.canDelete).toEqual([]);
    expect(result.current.canPublish).toEqual([]);
  });

  it('should handle empty permissions array', () => {
    const mockParams = {
      collectionType: 'collection-types',
      slug: 'article',
      model: 'article',
    };

    const mockSchema = {
      pluginOptions: {
        i18n: {
          localized: true,
        },
      },
    };

    mockUseParams.mockReturnValue(mockParams);
    mockUseAuth.mockReturnValue([]);
    mockUseDocument.mockReturnValue({
      schema: mockSchema,
    } as unknown as ReturnType<typeof useDocument>);

    const { result } = renderHook(() => useI18n());

    expect(result.current.hasI18n).toBe(true);
    expect(result.current.canCreate).toEqual([]);
    expect(result.current.canRead).toEqual([]);
    expect(result.current.canUpdate).toEqual([]);
    expect(result.current.canDelete).toEqual([]);
    expect(result.current.canPublish).toEqual([]);
  });
});
