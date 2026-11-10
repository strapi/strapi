import { render as renderAdmin } from '@strapi/admin/strapi-admin/test';
import { configure, createEvent, fireEvent, within } from '@testing-library/react';
import { render, screen, server, waitFor } from '@tests/utils';
import { http, HttpResponse } from 'msw';
import { Route, Routes, useLocation } from 'react-router-dom';

import { upgradeVersion1 } from '../../../../../shared/builder/upgrade';
import { PERMISSIONS } from '../../../constants';
import { ConditionsPage } from '../ConditionsPage';

import { ARTICLE, LAYOUT, listItem } from './fixtures';

import type { BuilderConditionV2 } from '../../../../../shared/builder/types';
import type {
  BuilderLayout,
  ConditionListItem,
  ConditionPreviewRequest,
} from '../../../../../shared/contracts/conditions';

/**
 * Saving waits on mocked server answers and on the restart status the page polls. On a busy CI
 * runner that takes longer than Testing Library's one-second default, so the waits get five.
 */
configure({ asyncUtilTimeout: 5000 });

/**
 * The page takes the restart overlay from `@strapi/strapi/admin`, which loads the whole admin, the
 * Media Library's cropper included: mock its stylesheet to avoid the error, as the color picker does.
 */
jest.mock('cropperjs/dist/cropper.css?raw', () => '', {
  virtual: true,
});

/** The test providers always run as in development: the cases that need otherwise set this. */
let mockAutoReload = true;

jest.mock('@strapi/admin/strapi-admin', () => ({
  ...jest.requireActual('@strapi/admin/strapi-admin'),
  useAppInfo: (_consumer: string, selector: (state: { autoReload: boolean }) => unknown) =>
    selector({ autoReload: mockAutoReload }),
}));

const USER_TYPE = 'plugin::end-users.user';
const TAG = 'api::tag.tag';

/** What `GET /end-users/conditions/builder-layout` answers: an Article with a few of each kind of field */
const BUILDER_LAYOUT: BuilderLayout = {
  contentTypes: [
    {
      uid: ARTICLE,
      displayName: 'Article',
      kind: 'collectionType',
      userRelations: ['author'],
      attributes: [
        { name: 'title', type: 'string' },
        { name: 'views', type: 'integer' },
        { name: 'status', type: 'enumeration', enum: ['draft', 'live'] },
        { name: 'createdAt', type: 'datetime' },
        { name: 'publishedAt', type: 'datetime' },
        { name: 'author', type: 'relation', relation: { target: USER_TYPE, toMany: false } },
        { name: 'tags', type: 'relation', relation: { target: TAG, toMany: true } },
      ],
    },
    {
      uid: 'api::comment.comment',
      displayName: 'Comment',
      kind: 'collectionType',
      userRelations: [],
      attributes: [
        { name: 'title', type: 'string' },
        { name: 'views', type: 'string' },
      ],
    },
    {
      uid: TAG,
      displayName: 'Tag',
      kind: 'collectionType',
      userRelations: [],
      attributes: [{ name: 'name', type: 'string' }],
    },
  ],
  userAttributes: [
    { name: 'email', type: 'email' },
    { name: 'name', type: 'string' },
  ],
  profileAttributes: [{ name: 'company', type: 'string' }],
  roles: ['Editor', 'Author'],
};

const builderFile = (parts: Partial<BuilderConditionV2> = {}): BuilderConditionV2 => ({
  version: 2,
  slug: 'mine',
  displayName: 'Mine',
  appliesTo: { kind: 'types', types: [ARTICLE] },
  inputs: [],
  who: { match: 'all', checks: [] },
  which: {
    kind: 'group',
    match: 'all',
    items: [
      {
        kind: 'check',
        target: { path: ['views'] },
        operator: '$gte',
        value: { kind: 'fixed', value: 3 },
      },
    ],
  },
  onSave: { stamp: [], locked: [] },
  ...parts,
});

const MINE = listItem({
  name: 'api::mine',
  displayName: 'Mine',
  subjects: [ARTICLE],
  source: 'builder',
  builder: builderFile(),
});

const USED = listItem({
  name: 'api::used',
  displayName: 'Used',
  subjects: [ARTICLE],
  source: 'builder',
  usedBy: 2,
  builder: builderFile({ slug: 'used', displayName: 'Used' }),
});

const WITH_INPUT = listItem({
  name: 'api::with-input',
  displayName: 'With input',
  subjects: [ARTICLE],
  source: 'builder',
  builder: builderFile({
    slug: 'with-input',
    displayName: 'With input',
    inputs: [{ name: 'minTitle', kind: 'text', required: false, default: 'ok' }],
    which: {
      kind: 'group',
      match: 'all',
      items: [
        {
          kind: 'check',
          target: { path: ['title'] },
          operator: '$startsWith',
          value: { kind: 'input', name: 'minTitle' },
        },
      ],
    },
  }),
});

/** A version 1 file, which the server has already upgraded when it lists it */
const V1 = listItem({
  name: 'api::old',
  displayName: 'Old',
  subjects: [ARTICLE],
  source: 'builder',
  builder: upgradeVersion1({
    slug: 'old',
    displayName: 'Old',
    subjects: [ARTICLE],
    query: { $and: [{ title: { $startsWith: 'A' } }, { views: { $gte: 3 } }] },
  }),
});

const BY_CODE = listItem({
  name: 'api::by-code',
  displayName: 'By code',
  subjects: [ARTICLE],
  source: 'code',
  editable: false,
});

const LIST_PATH = '/settings/end-users/conditions';

/** The Content Manager's list of end users: a regular expression, as the colons of the uid are not a path's */
const SAMPLE_USERS = /\/content-manager\/collection-types\/plugin::end-users\.user$/;

/** The location of the list itself: `toHaveTextContent` takes a text as a part of one */
const AT_THE_LIST = new RegExp(`^${LIST_PATH}$`);

const LocationDisplay = () => <p data-testid="location">{useLocation().pathname}</p>;

const tree = (
  <>
    <Routes>
      <Route path="/settings/end-users/conditions/*" element={<ConditionsPage />} />
    </Routes>
    <LocationDisplay />
  </>
);

const renderAt = (path: string) => render(tree, { initialEntries: [`${LIST_PATH}/${path}`] });

/** What the server answers `GET /end-users/conditions` with: a write changes it */
let conditions: ConditionListItem[];
let listRequests: number;
/** The status answers "updating" this many more times: a write sets it, the restart ends it */
let updatingFor: number;
let statusRequests: number;
let layoutRequests: number;

const answerError = (status: number, name: string, message: string, details: object = {}) =>
  HttpResponse.json({ error: { status, name, message, details } }, { status });

beforeEach(() => {
  mockAutoReload = true;
  conditions = [MINE, USED, WITH_INPUT, V1, BY_CODE];
  listRequests = 0;
  updatingFor = 0;
  statusRequests = 0;
  layoutRequests = 0;

  server.use(
    // The role editor's layout: the list page and the role editor read it
    http.get('/end-users/permissions/layout', () => HttpResponse.json({ data: LAYOUT })),
    http.get('/end-users/conditions/builder-layout', () => {
      layoutRequests += 1;

      return HttpResponse.json({ data: BUILDER_LAYOUT });
    }),
    http.get('/end-users/conditions', () => {
      listRequests += 1;

      return HttpResponse.json({ data: conditions });
    }),
    http.get('/end-users/conditions/status', () => {
      statusRequests += 1;

      if (updatingFor > 0) {
        updatingFor -= 1;

        return HttpResponse.json({ data: { isUpdating: true } });
      }

      return HttpResponse.json({ data: { isUpdating: false } });
    })
  );
});

const findHeading = (name: string) => screen.findByRole('heading', { name });

const saveButton = () => screen.getByRole('button', { name: 'Save' });

/**
 * Clicks Save once it is enabled. It stays disabled until the permissions and the restart status
 * have loaded, and a click on a disabled button does nothing.
 */
const clickSave = async () => {
  await waitFor(() => expect(saveButton()).toBeEnabled());
  fireEvent.click(saveButton());
};

/** The restart overlay's title, with or without the dots the admin's own copy ends with */
const OVERLAY = /^Waiting for restart/;

/**
 * Waits for the restart overlay. It shows only while the page polls the status, so on a slow runner
 * it can be gone again before an assertion on the found element runs: finding it is the check.
 */
const overlayShown = () => screen.findByText(OVERLAY);

const expectBackAtTheList = () =>
  waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(AT_THE_LIST));

/** Opens a condition and waits for its page */
const openCondition = async (slug: string, title: string) => {
  const rendered = renderAt(slug);

  await findHeading(title);

  return rendered;
};

type User = ReturnType<typeof render>['user'];

/** Picks an option of a single select by its accessible name */
const choose = async (user: User, select: string, option: string) => {
  await user.click(await screen.findByRole('combobox', { name: select }));
  await user.click(await screen.findByRole('option', { name: option }));
};

/** A new condition with a name, a display name and Article */
const startNew = async (user: User, slug = 'fresh', displayName = 'Fresh') => {
  await findHeading('New condition');
  await user.type(screen.getByRole('textbox', { name: /^Name/ }), slug);
  await user.type(screen.getByRole('textbox', { name: /Display name/ }), displayName);
  await user.click(screen.getByRole('combobox', { name: /Content types/ }));
  await user.click(await screen.findByRole('option', { name: 'Article' }));
  // The list of a multiple select stays open, and hides the page from the roles queries
  await user.keyboard('{Escape}');
};

const FRESH = listItem({
  name: 'api::fresh',
  displayName: 'Fresh',
  subjects: [ARTICLE],
  source: 'builder',
});

describe('BuilderPage', () => {
  describe('preview', () => {
    const SAMPLE_USER = { results: [{ documentId: 'u1', email: 'ada@example.com' }] };

    /** Records the preview request and the filter of the user lookup */
    const serveSampleUser = (
      answerPreview: () => Response = () => HttpResponse.json({ data: { matching: 12, total: 40 } })
    ) => {
      const seen: { preview?: ConditionPreviewRequest; lookup?: string | null } = {};

      server.use(
        http.get(SAMPLE_USERS, ({ request }) => {
          seen.lookup = new URL(request.url).searchParams.get('filters[$and][0][email][$eqi]');

          return HttpResponse.json(SAMPLE_USER);
        }),
        http.post('/end-users/conditions/preview', async ({ request }) => {
          seen.preview = (await request.json()) as ConditionPreviewRequest;

          return answerPreview();
        })
      );

      return seen;
    };

    const preview = async (user: User, email = 'ada@example.com') => {
      await user.type(screen.getByRole('textbox', { name: "End user's email" }), email);
      await user.click(screen.getByRole('button', { name: 'Preview' }));
    };

    it('previews matching entries for a sample user', async () => {
      const seen = serveSampleUser();
      const { user } = await openCondition('mine', 'Mine');

      await preview(user);

      expect(await screen.findByText('12 of 40 articles')).toBeInTheDocument();
      expect(screen.getByText('The condition keeps these for ada@example.com.')).toBeVisible();
      // The user is found by email, and the preview is of the condition as the form has it
      expect(seen.lookup).toBe('ada@example.com');
      expect(seen.preview).toEqual({
        condition: { ...MINE.builder, slug: 'preview', displayName: 'Preview' },
        subject: ARTICLE,
        userDocumentId: 'u1',
        inputs: {},
      });
    });

    it('previews with the inputs filled', async () => {
      const seen = serveSampleUser();
      const { user } = await openCondition('with-input', 'With input');

      // The input starts at its default, and what is typed replaces it
      const input = screen.getByRole('textbox', { name: 'minTitle' });

      expect(input).toHaveValue('ok');

      await user.clear(input);
      await user.type(input, 'ab');
      await preview(user);

      expect(await screen.findByText('12 of 40 articles')).toBeInTheDocument();
      expect(seen.preview?.inputs).toEqual({ minTitle: 'ab' });
    });

    it('says the admin needs Content Manager read when the preview is refused', async () => {
      serveSampleUser(() =>
        answerError(
          403,
          'ForbiddenError',
          'Previewing a condition needs Content Manager read access to the content type and to end users'
        )
      );
      const { user } = await openCondition('mine', 'Mine');

      await preview(user);

      expect(
        await screen.findByText(
          'Previewing a condition needs Content Manager read access to the content type and to end users'
        )
      ).toBeInTheDocument();
      expect(screen.queryByText(/of 40/)).not.toBeInTheDocument();
    });

    it('shows the message the server gives for a user with no profile it can read', async () => {
      serveSampleUser(() =>
        answerError(403, 'ForbiddenError', 'This user has no profile you can read')
      );
      const { user } = await openCondition('mine', 'Mine');

      await preview(user);

      expect(await screen.findByText('This user has no profile you can read')).toBeInTheDocument();
    });

    it('says so when the admin may not read end users to find one', async () => {
      server.use(http.get(SAMPLE_USERS, () => answerError(403, 'ForbiddenError', 'Forbidden')));
      const { user } = await openCondition('mine', 'Mine');

      await preview(user);

      expect(
        await screen.findByText(
          'Finding an end user needs Content Manager read access to end users.'
        )
      ).toBeInTheDocument();
    });

    it('says so when no end user has the email, and asks for no preview', async () => {
      const seen = serveSampleUser();

      server.use(http.get(SAMPLE_USERS, () => HttpResponse.json({ results: [] })));
      const { user } = await openCondition('mine', 'Mine');

      await preview(user, 'nobody@example.com');

      expect(
        await screen.findByText('No end user has the email nobody@example.com.')
      ).toBeInTheDocument();
      expect(seen.preview).toBeUndefined();
    });

    it('does not preview a condition with problems', async () => {
      serveSampleUser();
      const { user } = renderAt('new');

      await findHeading('New condition');
      await user.type(screen.getByRole('textbox', { name: "End user's email" }), 'ada@example.com');

      // No content type is chosen yet
      expect(screen.getByRole('button', { name: 'Preview' })).toBeDisabled();
      expect(
        screen.getByText('Fix the problems listed above to preview this condition.')
      ).toBeInTheDocument();
    });

    it('runs the preview on Enter, which the form does not take as a save', async () => {
      const seen = serveSampleUser();
      let written = false;

      server.use(
        http.put('/end-users/conditions/mine', () => {
          written = true;

          return HttpResponse.json({ data: { data: MINE } });
        })
      );
      const { user } = await openCondition('mine', 'Mine');

      // With an edit to save, the Enter of an input of the form would submit it
      await user.type(screen.getByRole('textbox', { name: /Display name/ }), '!');
      expect(saveButton()).toBeEnabled();

      const email = screen.getByRole('textbox', { name: "End user's email" });

      await user.type(email, 'ada@example.com');

      const enter = createEvent.keyDown(email, { key: 'Enter' });

      fireEvent(email, enter);

      // The browser submits a form on Enter unless the key is stopped
      expect(enter.defaultPrevented).toBe(true);
      expect(await screen.findByText('12 of 40 articles')).toBeInTheDocument();
      expect(seen.preview?.userDocumentId).toBe('u1');
      expect(written).toBe(false);
    });

    it('hides a result once what it was run for has changed', async () => {
      serveSampleUser();
      const { user } = await openCondition('mine', 'Mine');

      await preview(user);
      expect(await screen.findByText('12 of 40 articles')).toBeInTheDocument();

      await user.type(screen.getByRole('textbox', { name: "End user's email" }), 'm');

      expect(screen.queryByText('12 of 40 articles')).not.toBeInTheDocument();
    });
  });

  describe('building', () => {
    it('offers Where fields from the builder layout, createdAt included', async () => {
      const { user } = renderAt('new');

      await startNew(user);
      await user.click(screen.getByRole('button', { name: 'Add check' }));
      await user.click(await screen.findByRole('combobox', { name: 'Which check 1 field' }));

      const offered = (await screen.findAllByRole('option')).map((option) => option.textContent);

      expect(offered).toEqual(
        expect.arrayContaining(['title', 'views', 'createdAt', 'publishedAt'])
      );
      // A relation is reached through its entry id or the fields of what it points at
      expect(offered).toEqual(
        expect.arrayContaining(['author.email', 'tags.name', 'tags.documentId'])
      );
      await user.click(screen.getByRole('option', { name: 'createdAt' }));
      expect(screen.getByRole('combobox', { name: 'Which check 1 field' })).toHaveTextContent(
        'createdAt'
      );
    });

    it('shows the operators of the field type only', async () => {
      const { user } = renderAt('new');

      await startNew(user);
      await user.click(screen.getByRole('button', { name: 'Add check' }));
      await choose(user, 'Which check 1 field', 'views');
      await user.click(screen.getByRole('combobox', { name: 'Which check 1 operator' }));

      expect(screen.getByRole('option', { name: 'is at least' })).toBeInTheDocument();
      expect(screen.queryByRole('option', { name: 'contains' })).not.toBeInTheDocument();
      await user.keyboard('{Escape}');

      await choose(user, 'Which check 1 field', 'title');
      await user.click(screen.getByRole('combobox', { name: 'Which check 1 operator' }));

      expect(screen.getByRole('option', { name: 'contains' })).toBeInTheDocument();
      expect(screen.queryByRole('option', { name: 'is at least' })).not.toBeInTheDocument();
    });

    it('adds a nested any-of group inside all-of and saves it', async () => {
      let body: Record<string, unknown> | undefined;

      server.use(
        http.post('/end-users/conditions', async ({ request }) => {
          body = (await request.json()) as Record<string, unknown>;
          updatingFor = 1;
          conditions = [...conditions, FRESH];

          return HttpResponse.json({ data: FRESH }, { status: 201 });
        })
      );
      const { user } = renderAt('new');

      await startNew(user);
      await user.click(screen.getByRole('button', { name: 'Add check' }));
      await user.type(screen.getByRole('textbox', { name: 'Which check 1 value' }), 'abc');
      await user.click(screen.getByRole('button', { name: 'Add group' }));

      const group = screen.getByRole('group', { name: 'Which group 2' });

      // The nested group is "any of", and has no "Add group" of its own
      expect(
        within(group).getByRole('combobox', { name: 'Which group 2 match' })
      ).toHaveTextContent('Any of');
      expect(within(group).queryByRole('button', { name: 'Add group' })).not.toBeInTheDocument();

      // A new group starts with one check, which a nested group needs
      await user.type(screen.getByRole('textbox', { name: 'Which group 2 check 1 value' }), 'x');

      await clickSave();

      await overlayShown();
      await expectBackAtTheList();

      expect(body).toMatchObject({
        version: 2,
        slug: 'fresh',
        appliesTo: { kind: 'types', types: [ARTICLE] },
        which: {
          kind: 'group',
          match: 'all',
          items: [
            {
              kind: 'check',
              target: { path: ['title'] },
              operator: '$eq',
              value: { kind: 'fixed', value: 'abc' },
            },
            {
              kind: 'group',
              match: 'any',
              items: [
                {
                  kind: 'check',
                  target: { path: ['title'] },
                  operator: '$eq',
                  value: { kind: 'fixed', value: 'x' },
                },
              ],
            },
          ],
        },
      });
    });

    it('refuses none-of across a to-many path before saving', async () => {
      let written = 0;

      server.use(
        http.post('/end-users/conditions', () => {
          written += 1;

          return HttpResponse.json({ data: FRESH }, { status: 201 });
        })
      );
      const { user } = renderAt('new');

      await startNew(user);
      await user.click(screen.getByRole('button', { name: 'Add check' }));
      await choose(user, 'Which check 1 field', 'tags.name');
      await user.type(screen.getByRole('textbox', { name: 'Which check 1 value' }), 'news');

      expect(saveButton()).toBeEnabled();

      await choose(user, 'Which match', 'None of');

      expect(
        await screen.findByText(
          "is not, does not include and none of can't cross the to-many relation tags"
        )
      ).toBeInTheDocument();
      expect(saveButton()).toBeDisabled();
      expect(written).toBe(0);
    });

    it('saves a Who roles check by name', async () => {
      let body: Record<string, unknown> | undefined;

      server.use(
        http.post('/end-users/conditions', async ({ request }) => {
          body = (await request.json()) as Record<string, unknown>;
          updatingFor = 1;

          return HttpResponse.json({ data: FRESH }, { status: 201 });
        })
      );
      const { user } = renderAt('new');

      await startNew(user);
      await user.click(screen.getByRole('button', { name: 'Add roles check' }));
      await user.click(screen.getByRole('combobox', { name: 'Who check 1 roles' }));
      await user.click(await screen.findByRole('option', { name: 'Editor' }));
      await user.keyboard('{Escape}');

      await clickSave();

      await overlayShown();
      await expectBackAtTheList();
      expect(body?.who).toEqual({
        match: 'all',
        checks: [{ kind: 'roles', match: 'any', roles: ['Editor'] }],
      });
    });

    it('saves a stamp that sets author to the signed-in user', async () => {
      let body: Record<string, unknown> | undefined;

      server.use(
        http.post('/end-users/conditions', async ({ request }) => {
          body = (await request.json()) as Record<string, unknown>;
          updatingFor = 1;

          return HttpResponse.json({ data: FRESH }, { status: 201 });
        })
      );
      const { user } = renderAt('new');

      await startNew(user);
      await user.click(screen.getByRole('button', { name: 'Set a field on create' }));
      await choose(user, 'Stamp 1 field', 'author');

      expect(screen.getByText('Set to the signed-in user')).toBeInTheDocument();

      await clickSave();

      await overlayShown();
      await expectBackAtTheList();
      expect(body?.onSave).toEqual({
        stamp: [{ field: 'author', value: { kind: 'user' } }],
        locked: [],
      });
    });

    it('shows the restricts-nothing note for an empty condition', async () => {
      const { user } = renderAt('new');

      await findHeading('New condition');
      expect(screen.getByText('This condition restricts nothing.')).toBeInTheDocument();

      await startNew(user);
      await user.click(screen.getByRole('button', { name: 'Add check' }));

      expect(screen.queryByText('This condition restricts nothing.')).not.toBeInTheDocument();
    });

    it('shows what is wrong with a field under it once it is left, in words without keys', async () => {
      const { user } = renderAt('new');

      await findHeading('New condition');

      const name = screen.getByRole('textbox', { name: /^Name/ });
      const displayName = screen.getByRole('textbox', { name: /Display name/ });

      await user.type(name, 'Bad Name');
      // Typing is not leaving: nothing is said yet, and nothing about the fields not reached
      expect(screen.queryByText(/^Use lowercase letters/)).not.toBeInTheDocument();
      expect(screen.queryByText(/displayName|types is a list/)).not.toBeInTheDocument();

      await user.tab();

      expect(await screen.findByText(/^Use lowercase letters, digits and hyphens/)).toBeVisible();
      expect(name).toBeInvalid();
      expect(displayName).not.toBeInvalid();

      await user.click(displayName);
      await user.tab();

      expect(await screen.findByText('This value is required.')).toBeVisible();
      expect(displayName).toBeInvalid();
      expect(screen.queryByText(/displayName|types is a list/)).not.toBeInTheDocument();
    });

    it('says a content type is needed on its field once the choice is closed with none', async () => {
      const { user } = renderAt('new');

      await findHeading('New condition');
      await user.click(screen.getByRole('combobox', { name: /Content types/ }));
      await user.keyboard('{Escape}');

      expect(await screen.findByText('Choose at least one content type.')).toBeVisible();
    });

    it('locks a saved input name', async () => {
      const { user } = await openCondition('with-input', 'With input');

      expect(screen.getByRole('textbox', { name: 'Input 1 name' })).toBeDisabled();
      expect(screen.getByText("Input names can't change once saved")).toBeInTheDocument();

      // A new input is still named by the person
      await user.click(screen.getByRole('button', { name: 'Add input' }));

      expect(screen.getByRole('textbox', { name: 'Input 2 name' })).toBeEnabled();
    });

    it('keeps a field input required: the control is on and cannot be turned off', async () => {
      const { user } = await openCondition('with-input', 'With input');

      await user.click(screen.getByRole('button', { name: 'Add input' }));

      const required = () => screen.getByRole('checkbox', { name: 'Input 2 required' });

      expect(required()).not.toBeChecked();
      expect(required()).toBeEnabled();

      await user.click(screen.getByRole('combobox', { name: 'Input 2 kind' }));
      await user.click(await screen.findByRole('option', { name: 'A field' }));

      expect(required()).toBeChecked();
      expect(required()).toBeDisabled();
    });

    it('opens a v1 condition as an all-of group', async () => {
      await openCondition('old', 'Old');

      expect(screen.getByRole('combobox', { name: 'Which match' })).toHaveTextContent('All of');
      expect(screen.getByRole('combobox', { name: 'Which check 1 field' })).toHaveTextContent(
        'title'
      );
      expect(screen.getByRole('combobox', { name: 'Which check 1 operator' })).toHaveTextContent(
        'starts with'
      );
      expect(screen.getByRole('textbox', { name: 'Which check 1 value' })).toHaveValue('A');
      expect(screen.getByRole('combobox', { name: 'Which check 2 field' })).toHaveTextContent(
        'views'
      );
    });
  });

  describe('save', () => {
    /** Answers a write, and makes the status say "updating" twice before the restart is over */
    const serveWrite = (
      method: 'post' | 'put' | 'delete',
      path: string,
      answer: (body: Record<string, unknown>) => Response,
      after?: () => void
    ) => {
      const seen: { body?: Record<string, unknown>; calls: number } = { calls: 0 };

      server.use(
        http[method](path, async ({ request }) => {
          seen.calls += 1;
          seen.body = method === 'delete' ? undefined : ((await request.json()) as never);
          updatingFor = 2;
          after?.();

          return answer(seen.body ?? {});
        })
      );

      return seen;
    };

    it('saves, waits for the restart and returns to the list', async () => {
      const renamed = { ...MINE, displayName: 'Mine, renamed' };
      const seen = serveWrite(
        'put',
        '/end-users/conditions/mine',
        () => HttpResponse.json({ data: renamed }),
        () => {
          conditions = [renamed, USED, WITH_INPUT, V1, BY_CODE];
        }
      );
      const { user } = await openCondition('mine', 'Mine');
      const initialListRequests = listRequests;
      const initialLayoutRequests = layoutRequests;

      const name = screen.getByRole('textbox', { name: /Display name/ });

      await user.clear(name);
      await user.type(name, 'Mine, renamed');
      await clickSave();

      // Locked from the write until the server answers again
      await overlayShown();

      await waitFor(() => expect(screen.queryByText(OVERLAY)).not.toBeInTheDocument());
      await expectBackAtTheList();

      expect(seen.body).toEqual({ ...MINE.builder, displayName: 'Mine, renamed' });
      // The page asked until the status said the server was back: twice "updating", then not
      expect(statusRequests).toBeGreaterThanOrEqual(1 + 3);
      // And it loaded the list again before going back: the list shows the new name
      expect(listRequests).toBeGreaterThan(initialListRequests);
      // The layout is read again: the server restarted, and the project may have changed
      expect(layoutRequests).toBeGreaterThan(initialLayoutRequests);
      expect(await screen.findByText('Mine, renamed')).toBeInTheDocument();
    });

    it('shows removed-input warnings after save', async () => {
      serveWrite('put', '/end-users/conditions/mine', () =>
        HttpResponse.json({
          data: MINE,
          warnings: { removedInputs: [{ name: 'limit', roles: ['Editor', 'Author'] }] },
        })
      );
      const { user } = await openCondition('mine', 'Mine');

      await user.type(screen.getByRole('textbox', { name: /Display name/ }), '!');
      await clickSave();

      expect(
        await screen.findByText(
          /The input limit is gone, and Editor, Author had a value bound to it/
        )
      ).toBeInTheDocument();
      // The page stays until the person goes back
      expect(screen.getByTestId('location')).toHaveTextContent(`${LIST_PATH}/mine`);

      await user.click(screen.getByRole('button', { name: 'Back to conditions' }));

      await expectBackAtTheList();
    });

    it('names the values users can change themselves after a save, and stays until the person goes back', async () => {
      serveWrite('put', '/end-users/conditions/mine', () =>
        HttpResponse.json({
          data: MINE,
          warnings: {
            selfWritable: [{ field: 'profile.plan', roles: ['Authenticated'] }],
          },
        })
      );
      const { user } = await openCondition('mine', 'Mine');

      await user.type(screen.getByRole('textbox', { name: /Display name/ }), '!');
      await clickSave();

      expect(await screen.findByText('Users can change these values themselves:')).toBeVisible();
      expect(screen.getByText('profile.plan (Authenticated)')).toBeVisible();
      expect(screen.getByTestId('location')).toHaveTextContent(`${LIST_PATH}/mine`);

      await user.click(screen.getByRole('button', { name: 'Back to conditions' }));

      await expectBackAtTheList();
    });

    it('asks before saving a condition roles use', async () => {
      const seen = serveWrite('put', '/end-users/conditions/used', () =>
        HttpResponse.json({ data: { ...USED, displayName: 'Used, renamed' } })
      );
      const { user } = await openCondition('used', 'Used');

      const name = screen.getByRole('textbox', { name: /Display name/ });

      await user.clear(name);
      await user.type(name, 'Used, renamed');
      await clickSave();

      const dialog = await screen.findByRole('alertdialog');

      expect(
        within(dialog).getByText('2 roles use this condition. Saving changes what they grant.')
      ).toBeInTheDocument();

      await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));

      await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
      expect(seen.calls).toBe(0);
      expect(screen.queryByText(OVERLAY)).not.toBeInTheDocument();
      // Still on the page, with the edit
      expect(screen.getByTestId('location')).toHaveTextContent(`${LIST_PATH}/used`);

      await clickSave();
      await user.click(
        within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Confirm' })
      );

      await waitFor(() => expect(seen.calls).toBe(1));
      expect(seen.body).toMatchObject({ slug: 'used', displayName: 'Used, renamed' });
      await expectBackAtTheList();
    });

    it('asks nothing before saving a condition no role uses', async () => {
      const seen = serveWrite('put', '/end-users/conditions/mine', () =>
        HttpResponse.json({ data: MINE })
      );
      const { user } = await openCondition('mine', 'Mine');

      await user.type(screen.getByRole('textbox', { name: /Display name/ }), '!');
      await clickSave();

      await waitFor(() => expect(seen.calls).toBe(1));
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      await expectBackAtTheList();
    });

    it('shows the refusal of a name on the Name field', async () => {
      server.use(
        http.post('/end-users/conditions', () =>
          answerError(400, 'ValidationError', 'The slug is taken', {
            errors: [{ path: ['slug'], message: 'The slug is taken', name: 'ValidationError' }],
          })
        )
      );
      const { user } = renderAt('new');

      await startNew(user);
      await clickSave();

      expect(await screen.findByText('The slug is taken')).toBeInTheDocument();
      expect(screen.queryByText(OVERLAY)).not.toBeInTheDocument();
    });

    it('says what a refusal that names no part says, above the page', async () => {
      serveWrite('put', '/end-users/conditions/mine', () =>
        answerError(409, 'ApplicationError', 'Another change waits for its restart', {
          code: 'CONDITIONS_UPDATING',
        })
      );
      const { user } = await openCondition('mine', 'Mine');

      await user.type(screen.getByRole('textbox', { name: /Display name/ }), '!');
      await clickSave();

      expect(await screen.findByText('Another change waits for its restart')).toBeInTheDocument();
      expect(screen.queryByText(OVERLAY)).not.toBeInTheDocument();
    });

    it('does not save while another write waits for its restart', async () => {
      updatingFor = 1;
      const { user } = await openCondition('mine', 'Mine');

      expect(
        await screen.findByText(/Another change is waiting for the server to restart/)
      ).toBeInTheDocument();

      await user.type(screen.getByRole('textbox', { name: /Display name/ }), '!');

      expect(saveButton()).toBeDisabled();
    });
  });

  describe('delete', () => {
    it('deletes, waits for the restart and returns to the list', async () => {
      let deleted = 0;

      server.use(
        http.delete('/end-users/conditions/mine', () => {
          deleted += 1;
          updatingFor = 2;
          conditions = [USED, WITH_INPUT, V1, BY_CODE];

          return HttpResponse.json({ data: { name: 'api::mine' } });
        })
      );
      const { user } = await openCondition('mine', 'Mine');

      // An edit that is not saved: deleting the condition is the answer to it, not a reason to ask
      await user.type(screen.getByRole('textbox', { name: /Display name/ }), '!');
      await user.click(screen.getByRole('button', { name: 'Delete' }));
      await user.click(
        within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Confirm' })
      );

      await overlayShown();
      await waitFor(() => expect(screen.queryByText(OVERLAY)).not.toBeInTheDocument());
      await expectBackAtTheList();

      expect(deleted).toBe(1);
      expect(screen.queryByText(/unsaved changes/)).not.toBeInTheDocument();
      expect(screen.queryByText('No content found')).not.toBeInTheDocument();
      expect(await screen.findByText('Used')).toBeInTheDocument();
      expect(screen.queryByText('Mine')).not.toBeInTheDocument();
    });

    it('cannot delete a condition roles use', async () => {
      await openCondition('used', 'Used');

      expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled();
      expect(screen.getByText(/Used by 2 roles/)).toBeInTheDocument();
    });

    it('has no Delete on a new condition', async () => {
      renderAt('new');

      await findHeading('New condition');

      expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
    });

    it('stays on the page and unlocks when the delete is refused', async () => {
      server.use(
        http.delete('/end-users/conditions/mine', () =>
          answerError(400, 'ValidationError', 'api::mine is used by 1 role')
        )
      );
      const { user } = await openCondition('mine', 'Mine');

      await user.click(screen.getByRole('button', { name: 'Delete' }));
      await user.click(
        within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Confirm' })
      );

      expect(await screen.findByText('api::mine is used by 1 role')).toBeInTheDocument();
      expect(screen.queryByText(OVERLAY)).not.toBeInTheDocument();
      expect(screen.getByTestId('location')).toHaveTextContent(`${LIST_PATH}/mine`);
    });
  });

  describe('leaving the page', () => {
    it('asks before leaving with edits that are not saved', async () => {
      const { user } = await openCondition('mine', 'Mine');

      await user.type(screen.getByRole('textbox', { name: /Display name/ }), '!');
      // The header shows the link from a medium screen up, which jsdom doesn't measure
      await user.click(screen.getByRole('link', { name: 'Back', hidden: true }));

      expect(await screen.findByText(/You have unsaved changes/)).toBeInTheDocument();
      expect(screen.getByTestId('location')).toHaveTextContent(`${LIST_PATH}/mine`);

      await user.click(
        within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Confirm' })
      );

      await expectBackAtTheList();
    });
  });

  describe('what opens', () => {
    it('opens only builder conditions', async () => {
      renderAt('by-code');

      expect(await screen.findByText('No content found')).toBeInTheDocument();
    });

    it('opens nothing for a name no condition has', async () => {
      renderAt('missing');

      expect(await screen.findByText('No content found')).toBeInTheDocument();
    });
  });

  describe('outside development', () => {
    it('is read-only, and Preview still works', async () => {
      mockAutoReload = false;
      server.use(
        http.get(SAMPLE_USERS, () =>
          HttpResponse.json({ results: [{ documentId: 'u1', email: 'ada@example.com' }] })
        ),
        http.post('/end-users/conditions/preview', () =>
          HttpResponse.json({ data: { matching: 1, total: 2 } })
        )
      );
      const { user } = await openCondition('mine', 'Mine');

      expect(
        screen.getByText(/Conditions can be created and changed only while Strapi runs with/)
      ).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: /^Name/ })).toBeDisabled();
      expect(screen.getByRole('textbox', { name: /Display name/ })).toBeDisabled();
      expect(screen.getByRole('combobox', { name: /Content types/ })).toHaveAttribute(
        'data-disabled'
      );
      expect(screen.getByRole('button', { name: 'Add check' })).toBeDisabled();
      expect(saveButton()).toBeDisabled();
      expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
      // Nothing asks the status outside development: nothing can be written
      expect(statusRequests).toBe(0);

      await user.type(screen.getByRole('textbox', { name: "End user's email" }), 'ada@example.com');
      await user.click(screen.getByRole('button', { name: 'Preview' }));

      expect(await screen.findByText('1 of 2 articles')).toBeInTheDocument();
    });

    it('is read-only for an admin who may only read conditions', async () => {
      renderAdmin(tree, {
        initialEntries: [`${LIST_PATH}/mine`],
        providerOptions: { permissions: PERMISSIONS.conditions.read },
      });

      await findHeading('Mine');

      expect(screen.getByRole('textbox', { name: /^Name/ })).toBeDisabled();
      expect(screen.getByRole('textbox', { name: /Display name/ })).toBeDisabled();
      expect(saveButton()).toBeDisabled();
      expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
      // Development, so the notice about `strapi develop` would be wrong
      expect(
        screen.queryByText(/Conditions can be created and changed only while Strapi runs with/)
      ).not.toBeInTheDocument();
    });
  });
});
