import { promptChecklist } from '../checklist-prompt';
import type { PackumentLookup } from '../registry';
import {
  buildPluginRow,
  describeLockedGroup,
  describeLockedRows,
  orderVisibleRows,
  promptForPlugins,
  toCheckboxChoice,
  type PluginRow,
} from '../selection';
import { createPackument } from './test-helpers';

jest.mock('../checklist-prompt', () => ({
  ...jest.requireActual('../checklist-prompt'),
  promptChecklist: jest.fn(),
}));

const aiByokEntry = {
  packageName: '@strapi-enterprise/plugin-ai-byok',
  displayName: 'AI BYOK',
  summary: 'Runs Strapi AI features with a customer-owned provider key.',
};

const availableLookup = (
  versions: Array<{ version: string; strapiRange?: string }>
): PackumentLookup => ({
  status: 'available',
  packument: createPackument(aiByokEntry.packageName, versions),
});

const threeVersions = availableLookup([
  { version: '1.1.0', strapiRange: '^5.52.0' },
  { version: '1.2.0', strapiRange: '^5.54.0' },
  { version: '1.3.0', strapiRange: '^5.56.0' },
]);

const rowFor = (lookup: PackumentLookup, installedVersion?: string, strapiVersion = '5.54.1') =>
  buildPluginRow({ entry: aiByokEntry, lookup, installedVersion, strapiVersion });

describe('buildPluginRow', () => {
  it('offers to install a licensed plugin, noting a newer version that needs a newer Strapi', () => {
    expect(rowFor(threeVersions)).toMatchObject({
      state: 'install',
      targetVersion: '1.2.0',
      newerVersionNote: '1.3.0 is available but requires Strapi ^5.56.0.',
    });
  });

  it('offers an upgrade for an older installed version', () => {
    expect(rowFor(threeVersions, '1.1.0')).toMatchObject({
      state: 'upgrade',
      installedVersion: '1.1.0',
      targetVersion: '1.2.0',
    });
  });

  it('shows an up-to-date plugin as installed', () => {
    expect(rowFor(threeVersions, '1.2.0')).toMatchObject({ state: 'installed' });
  });

  it('flags an installed plugin that the license no longer includes', () => {
    expect(rowFor({ status: 'not-licensed' }, '1.2.0')).toMatchObject({ state: 'not-licensed' });
  });

  it.each([[{ status: 'not-licensed' } as const], [{ status: 'not-found' } as const]])(
    'hides a plugin that is not installed and not available (%j)',
    (lookup) => {
      expect(rowFor(lookup)).toMatchObject({ state: 'hidden' });
    }
  );

  it('explains when no version fits the app Strapi version', () => {
    expect(rowFor(threeVersions, undefined, '5.50.0')).toMatchObject({
      state: 'no-compatible-version',
      requiredStrapiRange: '^5.56.0',
    });
  });

  it('explains when a plugin has no stable release yet', () => {
    expect(rowFor(availableLookup([{ version: '0.0.0-experimental.8be2653' }]))).toMatchObject({
      state: 'no-stable-release',
    });
  });
});

describe('orderVisibleRows', () => {
  it('puts upgrades first, locked rows last, and drops hidden rows', () => {
    const rows: PluginRow[] = [
      { entry: aiByokEntry, state: 'locked' },
      { entry: aiByokEntry, state: 'installed', installedVersion: '1.2.0' },
      { entry: aiByokEntry, state: 'hidden' },
      { entry: aiByokEntry, state: 'install', targetVersion: '1.2.0' },
      {
        entry: aiByokEntry,
        state: 'upgrade',
        installedVersion: '1.1.0',
        targetVersion: '1.2.0',
        isMajorUpgrade: false,
      },
    ];

    expect(orderVisibleRows(rows).map((row) => row.state)).toEqual([
      'upgrade',
      'install',
      'installed',
      'locked',
    ]);
  });
});

describe('toCheckboxChoice', () => {
  it('tags a package that is not a plugin with its kind', () => {
    const providerRow = buildPluginRow({
      entry: { ...aiByokEntry, displayName: 'S3 Upload', kind: 'provider' },
      lookup: threeVersions,
      strapiVersion: '5.54.1',
    });

    expect(toCheckboxChoice(providerRow).name).toContain(
      'S3 Upload (@strapi-enterprise/plugin-ai-byok) [provider]'
    );
    expect(toCheckboxChoice(rowFor(threeVersions)).name).not.toContain('[plugin]');
  });

  it('selects upgrades by default, with an [upgrade] tag and an exact version', () => {
    expect(toCheckboxChoice(rowFor(threeVersions, '1.1.0'))).toMatchObject({
      name: expect.stringContaining('1.1.0 → 1.2.0 [upgrade]'),
      value: '@strapi-enterprise/plugin-ai-byok@1.2.0',
      checked: true,
    });
  });

  it('offers a major upgrade without selecting it, with a [major upgrade] tag', () => {
    expect(toCheckboxChoice(rowFor(threeVersions, '0.9.0'))).toMatchObject({
      name: expect.stringContaining('0.9.0 → 1.2.0 [major upgrade]'),
      checked: false,
    });
  });

  it('adds the newer incompatible version after the summary, as its own sentence', () => {
    expect(toCheckboxChoice(rowFor(threeVersions)).name).toMatch(
      /1\.2\.0 {2}.+\. {2}1\.3\.0 is available but requires Strapi \^5\.56\.0\.$/
    );
  });

  it('offers the stable release over an installed prerelease without selecting it', () => {
    expect(toCheckboxChoice(rowFor(threeVersions, '0.0.0-experimental.8be2653'))).toMatchObject({
      name: expect.stringContaining('0.0.0-experimental.8be2653 → 1.2.0 [stable release]'),
      checked: false,
    });
  });

  it('drops the newer-version note when that version is already installed', () => {
    expect(rowFor(threeVersions, '1.3.0')).toMatchObject({
      state: 'installed',
      newerVersionNote: undefined,
    });
  });

  it('says which Strapi version a plugin with no compatible version requires', () => {
    expect(toCheckboxChoice(rowFor(threeVersions, undefined, '5.50.0')).disabled).toBe(
      'requires Strapi ^5.56.0'
    );
  });

  it('shows installed and unlicensed plugins as not selectable', () => {
    expect(toCheckboxChoice(rowFor(threeVersions, '1.2.0')).disabled).toContain('installed');
    expect(toCheckboxChoice(rowFor({ status: 'not-licensed' }, '1.2.0')).disabled).toBe(
      'not in your license'
    );
  });
});

describe('toCheckboxChoice for a locked row', () => {
  it('shows the summary and is not selectable', () => {
    expect(toCheckboxChoice({ entry: aiByokEntry, state: 'locked' })).toEqual({
      name: `AI BYOK (@strapi-enterprise/plugin-ai-byok)  ${aiByokEntry.summary}`,
      disabled: 'not in your license',
    });
  });

  it('ends with the label when there is no summary', () => {
    expect(toCheckboxChoice({ entry: { ...aiByokEntry, summary: '' }, state: 'locked' }).name).toBe(
      'AI BYOK (@strapi-enterprise/plugin-ai-byok)'
    );
  });
});

describe('describeLockedGroup', () => {
  it('adds the server message after the heading', () => {
    expect(describeLockedGroup('Contact Sales.')).toBe('Not in your license. Contact Sales.');
  });

  it.each([undefined, ''])('is the heading alone, with no trailing space, for %j', (message) => {
    expect(describeLockedGroup(message)).toBe('Not in your license.');
  });
});

describe('describeLockedRows', () => {
  it('shows the locked rows under the heading, as the prompt does', () => {
    expect(
      describeLockedRows(
        [{ entry: aiByokEntry, state: 'locked' }, rowFor(threeVersions, '1.2.0')],
        'Contact Sales.'
      )
    ).toBe(
      [
        'Not in your license. Contact Sales.',
        `  ✕ AI BYOK (@strapi-enterprise/plugin-ai-byok)  ${aiByokEntry.summary}`,
      ].join('\n')
    );
  });

  it('uses the heading alone when the server sends no message', () => {
    expect(describeLockedRows([{ entry: aiByokEntry, state: 'locked' }])).toMatch(
      /^Not in your license\.\n/
    );
  });

  it('is undefined when no row is locked', () => {
    expect(describeLockedRows([rowFor(threeVersions, '1.2.0')], 'Contact Sales.')).toBeUndefined();
  });
});

describe('promptForPlugins', () => {
  it('shows the visible rows as a checklist and returns the selected install specs', async () => {
    const promptChecklistMock = promptChecklist as jest.Mock;
    promptChecklistMock.mockResolvedValueOnce(['@strapi-enterprise/plugin-ai-byok@1.2.0']);

    await expect(promptForPlugins([rowFor(threeVersions, '1.1.0')])).resolves.toEqual([
      '@strapi-enterprise/plugin-ai-byok@1.2.0',
    ]);
    expect(promptChecklistMock).toHaveBeenCalledWith({
      message: 'Which Enterprise plugins do you want to install or upgrade?',
      choices: [
        expect.objectContaining({
          value: '@strapi-enterprise/plugin-ai-byok@1.2.0',
          short: 'AI BYOK',
          checked: true,
        }),
      ],
    });
    expect(promptChecklistMock.mock.lastCall[0].lockedGroup).toBeUndefined();
  });

  it('shows the locked rows apart, under the heading with the message', async () => {
    const promptChecklistMock = promptChecklist as jest.Mock;
    promptChecklistMock.mockResolvedValueOnce([]);
    const lockedEntry = { ...aiByokEntry, packageName: '@strapi-enterprise/plugin-locked' };

    await promptForPlugins(
      [{ entry: lockedEntry, state: 'locked' }, rowFor(threeVersions)],
      'Contact Sales.'
    );

    expect(promptChecklistMock).toHaveBeenCalledWith({
      message: 'Which Enterprise plugins do you want to install or upgrade?',
      choices: [expect.objectContaining({ value: '@strapi-enterprise/plugin-ai-byok@1.2.0' })],
      lockedGroup: {
        heading: 'Not in your license. Contact Sales.',
        choices: [
          expect.objectContaining({
            name: expect.stringContaining('@strapi-enterprise/plugin-locked'),
          }),
        ],
      },
    });
  });

  it('shows the heading alone when the server sends no message', async () => {
    const promptChecklistMock = promptChecklist as jest.Mock;
    promptChecklistMock.mockResolvedValueOnce([]);

    await promptForPlugins([{ entry: aiByokEntry, state: 'locked' }, rowFor(threeVersions)]);

    expect(promptChecklistMock.mock.lastCall[0].lockedGroup.heading).toBe('Not in your license.');
  });
});
