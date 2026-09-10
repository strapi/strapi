import { renderHook } from '@tests/utils';

import { getCurrentSpaceSlug } from '../../utils/currentSpace';
import { useEntryStates } from '../../utils/entryStates';
import { MoveToSpaceHeaderAction } from '../MoveToSpaceActions';

jest.mock('../../utils/currentSpace', () => ({
  DEFAULT_SPACE_SLUG: 'default',
  getCurrentSpaceSlug: jest.fn(() => 'default'),
}));

jest.mock('../../utils/entryStates', () => ({
  useEntryStates: jest.fn(() => ({})),
  clearEntryStateCache: jest.fn(),
}));

jest.mock('@strapi/admin/strapi-admin', () => ({
  ...jest.requireActual('@strapi/admin/strapi-admin'),
  useRBAC: jest.fn(() => ({ allowedActions: { canMoveEntry: true } })),
}));

const ACME = { id: 2, slug: 'acme', name: 'Acme', color: '#EE5E52' };
const DEFAULT = { id: 1, slug: 'default', name: 'Default', color: null };

const propsFor = (document: unknown) =>
  ({
    documentId: 'abc',
    model: 'api::article.article',
    collectionType: 'collection-types',
    activeTab: null,
    document,
    meta: undefined,
  }) as unknown as Parameters<typeof MoveToSpaceHeaderAction>[0];

describe('MoveToSpaceHeaderAction', () => {
  beforeEach(() => {
    jest.mocked(getCurrentSpaceSlug).mockReturnValue('default');
    jest.mocked(useEntryStates).mockReturnValue({});
  });

  describe('in the default workspace', () => {
    /**
     * The row carries its workspace, so the action costs no request: on a list
     * of 100 rows the lookup would otherwise be the page's biggest expense.
     */
    it('reads the workspace off the row without asking the server', () => {
      const { result } = renderHook(() =>
        MoveToSpaceHeaderAction(propsFor({ documentId: 'abc', space: ACME }))
      );

      expect(useEntryStates).toHaveBeenCalledWith('', []);
      expect(result.current).toMatchObject({ position: ['header'] });
    });

    it('offers nothing on a shared entry', () => {
      const { result } = renderHook(() =>
        MoveToSpaceHeaderAction(propsFor({ documentId: 'abc', space: null }))
      );

      expect(result.current).toBeNull();
    });
  });

  describe('in a sub-workspace', () => {
    beforeEach(() => {
      jest.mocked(getCurrentSpaceSlug).mockReturnValue('acme');
    });

    /**
     * A shared content type's rows stay visible in every workspace carrying
     * whichever workspace stamped them, so a non-null `space` on the row is not
     * permission to move it — the server refuses. Only the entry state knows.
     */
    it('does not offer a move the server would refuse on a shared content type', () => {
      jest.mocked(useEntryStates).mockReturnValue({
        abc: { space: DEFAULT, editable: false, reason: 'shared-content-type' },
      });

      const { result } = renderHook(() =>
        MoveToSpaceHeaderAction(propsFor({ documentId: 'abc', space: DEFAULT }))
      );

      expect(useEntryStates).toHaveBeenCalledWith('api::article.article', ['abc']);
      expect(result.current).toBeNull();
    });

    it('offers a move on an entry the workspace owns', () => {
      jest.mocked(useEntryStates).mockReturnValue({ abc: { space: ACME, editable: true } });

      const { result } = renderHook(() =>
        MoveToSpaceHeaderAction(propsFor({ documentId: 'abc', space: ACME }))
      );

      expect(result.current).toMatchObject({ position: ['header'] });
    });
  });
});
