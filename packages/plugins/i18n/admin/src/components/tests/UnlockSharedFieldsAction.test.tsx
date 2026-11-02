import * as React from 'react';

import { Form, useForm } from '@strapi/admin/strapi-admin';
import { Dialog } from '@strapi/design-system';
import { act, render, renderHook, screen } from '@tests/utils';

import { UnlockSharedFieldsAction } from '../CMHeaderActions';

type DialogProps = { onClose: () => void };

import type { HeaderActionProps } from '@strapi/content-manager/strapi-admin';

const LOCALES = [
  { code: 'en', isDefault: true, name: 'English' },
  { code: 'fr', isDefault: false, name: 'French' },
];

const SCHEMA = {
  attributes: {
    shared: { type: 'string', pluginOptions: { i18n: { localized: false } } },
    title: { type: 'string', pluginOptions: { i18n: { localized: true } } },
    related: { type: 'relation' },
  },
};

const INITIAL_VALUES = {
  shared: 'locked-baseline',
  title: 'french-title',
  related: 7,
};

const mockUseQueryParams = jest.fn(() => [{ query: { plugins: { i18n: { locale: 'fr' } } } }]);
const mockUseGetLocalesQuery = jest.fn(() => ({ data: LOCALES }));
const mockUseI18n = jest.fn(() => ({ hasI18n: true, canUpdate: ['en'] }));
const mockUseDocument = jest.fn(() => ({ schema: SCHEMA }));
const mockUseHasDefaultLocaleEntry = jest.fn(() => true);
const mockLockState = {
  isUnlocked: false,
  unlock: jest.fn(),
  relock: jest.fn(),
};

type FormApi = {
  onChange: (eventOrPath: string, value?: unknown) => void;
  values: Record<string, unknown>;
};

const formApi: { current: FormApi | null } = { current: null };

const FormBridge = () => {
  const onChange = useForm('UnlockSharedFieldsActionTest', (state) => state.onChange);
  const values = useForm('UnlockSharedFieldsActionTest', (state) => state.values) as Record<
    string,
    unknown
  >;
  formApi.current = { onChange, values };
  return null;
};

jest.mock('@strapi/admin/strapi-admin', () => {
  const actual = jest.requireActual('@strapi/admin/strapi-admin');
  return {
    ...actual,
    useQueryParams: () => mockUseQueryParams(),
  };
});

jest.mock('@strapi/content-manager/strapi-admin', () => {
  const actual = jest.requireActual('@strapi/content-manager/strapi-admin');
  return {
    unstable_useDocument: () => mockUseDocument(),
    unstable_useDocumentActions: jest.fn(),
    unstable_useHasDefaultLocaleEntry: () => mockUseHasDefaultLocaleEntry(),
    unstable_isSharedI18nAttribute: actual.unstable_isSharedI18nAttribute,
    buildValidParams: jest.fn((query: unknown) => query),
    // Type-only in source; present so a runtime import of the name still resolves.
    HeaderActionProps: undefined,
    unstable_useI18nSharedFieldsLock: (
      _name: string,
      selector: (state: typeof mockLockState) => unknown
    ) => selector(mockLockState),
  };
});

jest.mock('../../hooks/useI18n', () => ({
  useI18n: () => mockUseI18n(),
}));

jest.mock('../../services/locales', () => ({
  useGetLocalesQuery: () => mockUseGetLocalesQuery(),
}));

const ACTION_PROPS = {
  activeTab: 'draft',
  collectionType: 'collection-types',
  documentId: 'doc-1',
  model: 'api::article.article',
} satisfies HeaderActionProps;

const renderAction = (props: Partial<HeaderActionProps> = {}) =>
  renderHook(() => UnlockSharedFieldsAction({ ...ACTION_PROPS, ...props }), {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <Form method="PUT" initialValues={INITIAL_VALUES}>
        <FormBridge />
        {children}
      </Form>
    ),
  });

describe('UnlockSharedFieldsAction', () => {
  beforeEach(() => {
    mockLockState.isUnlocked = false;
    mockLockState.unlock.mockClear();
    mockLockState.relock.mockClear();
    mockUseQueryParams.mockReturnValue([{ query: { plugins: { i18n: { locale: 'fr' } } } }]);
    mockUseGetLocalesQuery.mockReturnValue({ data: LOCALES });
    mockUseI18n.mockReturnValue({ hasI18n: true, canUpdate: ['en'] });
    mockUseDocument.mockReturnValue({ schema: SCHEMA });
    mockUseHasDefaultLocaleEntry.mockReturnValue(true);
    formApi.current = null;
  });

  it('hides the unlock action when the admin cannot update the default locale', () => {
    mockUseI18n.mockReturnValue({ hasI18n: true, canUpdate: ['fr'] });

    const { result } = renderAction();

    expect(result.current).toBeNull();
  });

  it('hides the unlock action on the default locale', () => {
    mockUseQueryParams.mockReturnValue([{ query: { plugins: { i18n: { locale: 'en' } } } }]);

    const { result } = renderAction();

    expect(result.current).toBeNull();
  });

  it('hides the unlock action when the entry has no default-locale version', () => {
    mockUseHasDefaultLocaleEntry.mockReturnValue(false);

    const { result } = renderAction();

    expect(result.current).toBeNull();
  });

  it('hides the unlock action on the published tab', () => {
    const { result } = renderAction({ activeTab: 'published' });

    expect(result.current).toBeNull();
  });

  it('offers edit shared fields on a secondary locale when the admin can update the default locale', () => {
    const { result } = renderAction();

    expect(result.current).toMatchObject({ label: 'Edit shared fields' });
  });

  it('unlocks only when the editor confirms the warning', async () => {
    const { result } = renderAction();
    const Content = (result.current as { dialog: { content: React.ComponentType<DialogProps> } })
      .dialog.content;
    const onClose = jest.fn();

    const { user } = render(
      <Dialog.Root open>
        <Dialog.Content>
          <Content onClose={onClose} />
        </Dialog.Content>
      </Dialog.Root>
    );

    expect(
      screen.getByText(
        'These values are shared across every locale. Saving changes will update English (en) and all other translations, not just French (fr).'
      )
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'No, cancel' }));
    expect(mockLockState.unlock).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'Yes, edit shared fields' }));
    expect(mockLockState.unlock).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('resets shared fields to the locked baseline when the editor re-locks', () => {
    mockLockState.isUnlocked = true;

    const { result } = renderAction();

    expect(result.current).toMatchObject({ label: 'Keep shared fields locked' });

    act(() => {
      formApi.current?.onChange('shared', 'edited-shared');
      formApi.current?.onChange('title', 'edited-title');
      formApi.current?.onChange('related', 9);
    });

    act(() => {
      const action = result.current as { onClick?: () => boolean } | null;
      action?.onClick?.();
    });

    expect(formApi.current?.values).toEqual({
      shared: 'locked-baseline',
      title: 'edited-title',
      related: 9,
    });
    expect(mockLockState.relock).toHaveBeenCalledTimes(1);
  });
});
