import type { NodePlopAPI } from 'plop';

import {
  readContentStructureFile,
  findRootFolderByName,
  sectionKeyForKind,
  listFolderChoices,
  getSectionGroups,
  type FolderSelection,
} from '../utils/content-structure';

type FolderChoiceValue = { kind: 'new' } | { kind: 'existing'; id: string };

const NEW_FOLDER: FolderChoiceValue = { kind: 'new' };

interface FolderPromptContext {
  destination?: string;
  kind: string;
}

/**
 * Asks where to place the generated content type in the content-structure folder tree.
 */
const getFolderPrompts = async (
  inquirer: any,
  plop: NodePlopAPI,
  { kind, destination }: FolderPromptContext
): Promise<{ folder?: FolderSelection }> => {
  // A plugin content type only loads once the plugin is enabled in the app config.
  // Since it can't be determined in this context whether a plugin is enabled or not,
  // a folder assignment could be pruned on the next write to groups.json boot if its
  // referenced content type is found not to exist. I've opted to sidestep this by
  // disabling folder assignment for plugin content-types for the time being.

  if (destination === 'plugin') {
    return {};
  }

  const read = readContentStructureFile(plop.getDestBasePath());

  if (read.status === 'invalid') {
    console.warn(
      'The content-structure file (src/content-structure/groups.json) could not be read. Skipping folder assignment.'
    );

    return {};
  }

  const sectionKey = sectionKeyForKind(kind);
  const groups = read.status === 'ok' ? getSectionGroups(read.file, sectionKey) : [];

  if (groups === null) {
    console.warn(
      `The "${sectionKey}" section of src/content-structure/groups.json is malformed. Skipping folder assignment.`
    );

    return {};
  }

  const { addToFolder } = await inquirer.prompt([
    {
      message: 'Add this content type to a folder?',
      name: 'addToFolder',
      type: 'confirm',
      default: false,
    },
  ]);

  if (!addToFolder) {
    return {};
  }

  const folderChoices = listFolderChoices(groups);

  const folderChoicesOptions = folderChoices.map((choice) => ({
    value: { kind: 'existing', id: choice.value },
    name: choice.name,
  }));

  if (folderChoicesOptions.length > 0) {
    const { folderChoice } = await inquirer.prompt([
      {
        message: 'Select a folder',
        name: 'folderChoice',
        type: 'list',
        default: 0,
        choices: [{ name: 'Create a new folder', value: NEW_FOLDER }, ...folderChoicesOptions],
        pageSize: folderChoicesOptions.length + 1,
      },
    ]);

    if (folderChoice.kind === 'existing') {
      return { folder: { targetGroupId: folderChoice.id } };
    }
  }

  const { folderName } = await inquirer.prompt([
    {
      message: 'Name of the new folder',
      name: 'folderName',
      type: 'input',
      validate(input: string) {
        if (typeof input !== 'string' || input.trim().length === 0) {
          return 'The folder name cannot be empty';
        }

        return true;
      },
    },
  ]);

  const trimmedName = folderName.trim();

  // A new folder whose name matches an existing root folder reuses that folder instead of creating a duplicate.
  const existingRootFolder = findRootFolderByName(groups, trimmedName);

  if (existingRootFolder) {
    return { folder: { targetGroupId: existingRootFolder.id } };
  }

  return { folder: { newFolderName: trimmedName } };
};

export default getFolderPrompts;
