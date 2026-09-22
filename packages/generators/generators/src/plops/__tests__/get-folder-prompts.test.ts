import path from 'node:path';
import { outputFile, outputJSON, remove } from 'fs-extra';

import type { NodePlopAPI } from 'plop';

import getFolderPrompts from '../prompts/get-folder-prompts';

describe('getFolderPrompts', () => {
  const outputDirectory = path.join(__dirname, 'output-folder-prompts');
  const groupsPath = path.join(outputDirectory, 'src/content-structure/groups.json');

  const plop = {
    getDestBasePath: () => path.join(outputDirectory, 'src'),
  } as unknown as NodePlopAPI;

  const makeInquirer = (...answers: Record<string, unknown>[]) => {
    const prompt = jest.fn();
    for (const answer of answers) {
      prompt.mockResolvedValueOnce(answer);
    }
    return { prompt };
  };

  const seededFile = (): any => ({
    version: 1,
    sections: {
      collectionTypes: {
        groups: [
          {
            parent: null,
            name: 'Shop',
            id: 'grp_shop1',
            children: [
              { type: 'group', id: 'grp_second1' },
              { type: 'group', id: 'grp_first1' },
            ],
          },
          {
            parent: 'grp_shop1',
            name: 'First in array',
            id: 'grp_first1',
            children: [],
          },
          {
            parent: 'grp_shop1',
            name: 'Second in array',
            id: 'grp_second1',
            children: [],
          },
        ],
      },
      singleTypes: { groups: [] },
    },
  });

  afterEach(async () => {
    await remove(outputDirectory);
    jest.restoreAllMocks();
  });

  test('skips the prompt entirely for the plugin destination', async () => {
    const inquirer = makeInquirer();

    const result = await getFolderPrompts(inquirer, plop, {
      kind: 'collectionType',
      destination: 'plugin',
    });

    expect(result).toEqual({});
    expect(inquirer.prompt).not.toHaveBeenCalled();
  });

  test('skips with a warning when the file is unreadable', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await outputFile(groupsPath, '{ not json');
    const inquirer = makeInquirer();

    const result = await getFolderPrompts(inquirer, plop, { kind: 'collectionType' });

    expect(result).toEqual({});
    expect(inquirer.prompt).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('could not be read'));
  });

  test('skips with a warning when the target section is malformed', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await outputJSON(groupsPath, {
      version: 1,
      sections: { collectionTypes: { groups: 'nope' }, singleTypes: { groups: [] } },
    });
    const inquirer = makeInquirer();

    const result = await getFolderPrompts(inquirer, plop, { kind: 'collectionType' });

    expect(result).toEqual({});
    expect(inquirer.prompt).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('malformed'));
  });

  test('declining the confirm returns no assignment', async () => {
    const inquirer = makeInquirer({ addToFolder: false });

    const result = await getFolderPrompts(inquirer, plop, { kind: 'collectionType' });

    expect(result).toEqual({});
    expect(inquirer.prompt).toHaveBeenCalledTimes(1);

    const [questions] = inquirer.prompt.mock.calls[0];
    expect(questions[0].type).toBe('confirm');
    expect(questions[0].message).toBe('Add this content type to a folder?');
  });

  test('confirming with no existing folders goes straight to the name input', async () => {
    const inquirer = makeInquirer({ addToFolder: true }, { folderName: 'Blog' });

    const result = await getFolderPrompts(inquirer, plop, { kind: 'collectionType' });

    expect(result).toEqual({ folder: { newFolderName: 'Blog' } });

    const [questions] = inquirer.prompt.mock.calls[1];
    expect(questions[0].name).toBe('folderName');
  });

  test('lists "Create a new folder" first, then folders in the parent children order with path labels', async () => {
    await outputJSON(groupsPath, seededFile());
    const inquirer = makeInquirer(
      { addToFolder: true },
      { folderChoice: { kind: 'existing', id: 'grp_shop1' } }
    );

    await getFolderPrompts(inquirer, plop, { kind: 'collectionType' });

    const [questions] = inquirer.prompt.mock.calls[1];
    expect(questions[0].choices.map((choice: { name: string }) => choice.name)).toEqual([
      'Create a new folder',
      'Shop',
      'Shop / Second in array',
      'Shop / First in array',
    ]);
  });

  test('an existing folder selection returns its group id, even an id shaped like a sentinel', async () => {
    const seeded = seededFile();
    seeded.sections.collectionTypes.groups.push({
      parent: null,
      name: 'Misc',
      id: 'new',
      children: [],
    });
    await outputJSON(groupsPath, seeded);
    const inquirer = makeInquirer(
      { addToFolder: true },
      { folderChoice: { kind: 'existing', id: 'new' } }
    );

    const result = await getFolderPrompts(inquirer, plop, { kind: 'collectionType' });

    expect(result).toEqual({ folder: { targetGroupId: 'new' } });
  });

  test('creating a folder whose name matches a root folder reuses it', async () => {
    await outputJSON(groupsPath, seededFile());
    const inquirer = makeInquirer(
      { addToFolder: true },
      { folderChoice: { kind: 'new' } },
      { folderName: '  shop ' }
    );

    const result = await getFolderPrompts(inquirer, plop, { kind: 'collectionType' });

    expect(result).toEqual({ folder: { targetGroupId: 'grp_shop1' } });
  });

  test('creating a folder with a fresh name returns the trimmed name', async () => {
    await outputJSON(groupsPath, seededFile());
    const inquirer = makeInquirer(
      { addToFolder: true },
      { folderChoice: { kind: 'new' } },
      { folderName: ' Blog ' }
    );

    const result = await getFolderPrompts(inquirer, plop, { kind: 'collectionType' });

    expect(result).toEqual({ folder: { newFolderName: 'Blog' } });
  });

  test('surfaces a dangling-parent folder as a root in the picker', async () => {
    // Core reparents this to root on boot; the picker must show it so a typed name
    // can never resolve to a folder the list never offered.
    const seeded = seededFile();
    seeded.sections.collectionTypes.groups.push({
      parent: 'grp_deleted1',
      name: 'Orphaned',
      id: 'grp_orphan1',
      children: [],
    });
    await outputJSON(groupsPath, seeded);
    const inquirer = makeInquirer(
      { addToFolder: true },
      { folderChoice: { kind: 'existing', id: 'grp_orphan1' } }
    );

    const result = await getFolderPrompts(inquirer, plop, { kind: 'collectionType' });

    const [questions] = inquirer.prompt.mock.calls[1];
    expect(questions[0].choices.map((choice: { name: string }) => choice.name)).toEqual([
      'Create a new folder',
      'Shop',
      'Shop / Second in array',
      'Shop / First in array',
      'Orphaned',
    ]);
    expect(result).toEqual({ folder: { targetGroupId: 'grp_orphan1' } });
  });

  test('typing the name of a dangling-parent folder reuses the folder now shown in the picker', async () => {
    const seeded = seededFile();
    seeded.sections.collectionTypes.groups.push({
      parent: 'grp_deleted1',
      name: 'Orphaned',
      id: 'grp_orphan1',
      children: [],
    });
    await outputJSON(groupsPath, seeded);
    const inquirer = makeInquirer(
      { addToFolder: true },
      { folderChoice: { kind: 'new' } },
      { folderName: 'orphaned' }
    );

    const result = await getFolderPrompts(inquirer, plop, { kind: 'collectionType' });

    expect(result).toEqual({ folder: { targetGroupId: 'grp_orphan1' } });
  });
});
