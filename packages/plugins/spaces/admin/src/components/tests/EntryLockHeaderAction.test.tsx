import { renderHook } from '@tests/utils';

import { getCurrentSpaceSlug } from '../../utils/currentSpace';
import { useEntryStates } from '../../utils/entryStates';
import { EntryLockHeaderAction } from '../EntryLockHeaderAction';

jest.mock('../../utils/currentSpace', () => ({
  DEFAULT_SPACE_SLUG: 'default',
  getCurrentSpaceSlug: jest.fn(() => 'acme'),
}));

jest.mock('../../utils/entryStates', () => ({
  useEntryStates: jest.fn(() => ({})),
}));

const props = {
  documentId: 'abc',
  model: 'api::article.article',
  collectionType: 'collection-types',
  activeTab: null,
  document: undefined,
  meta: undefined,
} as unknown as Parameters<typeof EntryLockHeaderAction>[0];

describe('EntryLockHeaderAction', () => {
  beforeEach(() => {
    jest.mocked(getCurrentSpaceSlug).mockReturnValue('acme');
    jest.mocked(useEntryStates).mockReturnValue({});
  });

  it('shows a disabled lock with the reason on a read-only entry', () => {
    jest
      .mocked(useEntryStates)
      .mockReturnValue({ abc: { space: null, editable: false, reason: 'shared-entry' } });

    const { result } = renderHook(() => EntryLockHeaderAction(props));

    expect(result.current).toMatchObject({
      disabled: true,
      label: expect.stringContaining('shared with every workspace'),
    });
  });

  it('renders nothing on an editable entry', () => {
    jest.mocked(useEntryStates).mockReturnValue({
      abc: { space: { id: 2, slug: 'acme', name: 'Acme', color: null }, editable: true },
    });

    const { result } = renderHook(() => EntryLockHeaderAction(props));

    expect(result.current).toBeNull();
  });

  /**
   * The default workspace edits everything, so it must not ask at all — an
   * empty model is how a caller opts out of the lookup.
   */
  it('asks for nothing in the default workspace', () => {
    jest.mocked(getCurrentSpaceSlug).mockReturnValue('default');

    const { result } = renderHook(() => EntryLockHeaderAction(props));

    expect(result.current).toBeNull();
    expect(useEntryStates).toHaveBeenLastCalledWith('', ['abc']);
  });
});
