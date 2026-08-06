import { ReactNode, useMemo } from 'react';

import { Combobox, ComboboxOption, Field } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { useDataManager } from './DataManager/useDataManager';
import { findSiblingFolderByName, sectionKeyForKind } from './DataManager/utils/contentStructure';
import { useFormModalNavigation } from './FormModalNavigation/useFormModalNavigation';

import type { FormChangeHandler, IntlLabel } from '../types';
import type { ContentStructureGroup, FolderSelection } from './DataManager/utils/contentStructure';
import type { Struct } from '@strapi/types';

interface FolderSelectProps {
  onChange: FormChangeHandler<FolderSelection | undefined, 'content-type-folder-select'>;
  modifiedData?: { kind?: Struct.ContentTypeKind };
  value?: FolderSelection;
  placeholder?: IntlLabel;
  error?: string | null;
  isCreating?: boolean;
  intlLabel: IntlLabel;
  targetUid?: string;
  name: string;
}

type FolderOption = { id: string; label: string };

/**
 * Flatten a section's (flat) folder groups into a list of full folder path strings.
 */
const buildFolderOptions = (groups: ContentStructureGroup[]): FolderOption[] => {
  const groupById = new Map(groups.map((group) => [group.id, group]));

  const childGroupIds = new Set<string>();

  for (const group of groups) {
    for (const child of group.children) {
      if (child.type === 'group') {
        childGroupIds.add(child.id);
      }
    }
  }

  const options: FolderOption[] = [];

  const walk = (group: ContentStructureGroup, ancestors: string[]) => {
    const path = [...ancestors, group.name];
    options.push({ id: group.id, label: path.join(' / ') });

    for (const child of group.children) {
      if (child.type !== 'group') {
        continue;
      }

      const subGroup = groupById.get(child.id);

      if (subGroup) {
        walk(subGroup, path);
      }
    }
  };

  groups
    .filter((group) => {
      return !childGroupIds.has(group.id);
    })
    .forEach((root) => {
      return walk(root, []);
    });

  return options;
};

export const FolderSelect = ({
  error = null,
  modifiedData,
  placeholder,
  isCreating,
  intlLabel,
  targetUid,
  onChange,
  value,
  name,
}: FolderSelectProps) => {
  const { kind: modalKind } = useFormModalNavigation();
  const { contentStructure } = useDataManager();
  const { formatMessage } = useIntl();

  const kind = (modifiedData?.kind ?? modalKind ?? 'collectionType') as Struct.ContentTypeKind;
  const section = sectionKeyForKind(kind);
  const groups = contentStructure.sections[section].groups;

  const folderOptions = useMemo(() => {
    return buildFolderOptions(groups);
  }, [groups]);
  const knownFolderIds = useMemo(() => {
    return new Set(folderOptions.map((option) => option.id));
  }, [folderOptions]);

  const currentFolderId = useMemo(() => {
    if (isCreating || !targetUid) {
      return null;
    }

    const owner = groups.find((group) => {
      return group.children.some((child) => {
        return child.type === 'contentType' && child.uid === targetUid;
      });
    });

    return owner?.id ?? null;
  }, [groups, isCreating, targetUid]);

  const change = (next: FolderSelection | undefined) => {
    onChange({ target: { name, value: next, type: 'content-type-folder-select' } });
  };

  const changeToFolderId = (id: string) => {
    change(id === currentFolderId ? undefined : { targetGroupId: id });
  };

  const selectTypedName = (typed: string) => {
    const existing = findSiblingFolderByName(groups, null, typed);

    if (existing) {
      changeToFolderId(existing.id);
      return;
    }

    change({ newFolderName: typed });
  };

  const selectedValue = (() => {
    if (value === undefined) {
      return currentFolderId ?? '';
    }

    if ('newFolderName' in value) {
      return value.newFolderName;
    }

    return value.targetGroupId ?? '';
  })();

  const selectedLabel = (() => {
    if (value && 'newFolderName' in value) {
      return value.newFolderName;
    }
    return folderOptions.find(({ id }) => id === selectedValue)?.label ?? '';
  })();

  const handleChange = (nextValue?: string) => {
    if (!nextValue) {
      return;
    }

    if (knownFolderIds.has(nextValue)) {
      changeToFolderId(nextValue);
      return;
    }

    selectTypedName(nextValue);
  };

  const handleCreateOption = (nextValue?: string) => {
    if (!nextValue) {
      return;
    }

    selectTypedName(nextValue);
  };

  const handleClear = () => {
    // In edit an explicit clear ungroups the content type. In create it just returns the field to its "no folder" default.
    change(isCreating ? undefined : { targetGroupId: null });
  };

  const errorMessage = error ? formatMessage({ id: error, defaultMessage: error }) : '';
  const placeholderText = placeholder ? formatMessage(placeholder) : undefined;
  const label = formatMessage(intlLabel);

  const comboboxOptions = useMemo(() => {
    const options: ReactNode[] = [];

    for (const option of folderOptions) {
      options.push(
        <ComboboxOption key={option.id} value={option.id}>
          {option.label}
        </ComboboxOption>
      );
    }

    // A new folder name typed into the combobox doesn't exist as a group yet, so we append it as its own option value.
    if (selectedValue && !knownFolderIds.has(selectedValue)) {
      options.push(
        <ComboboxOption key={`new:${selectedValue}`} value={selectedValue}>
          {selectedValue}
        </ComboboxOption>
      );
    }

    return options;
  }, [folderOptions, knownFolderIds, selectedValue]);

  return (
    <Field.Root error={errorMessage} name={name}>
      <Field.Label>{label}</Field.Label>
      <Combobox
        defaultTextValue={selectedLabel || undefined}
        onCreateOption={handleCreateOption}
        value={selectedValue || undefined}
        placeholder={placeholderText}
        onChange={handleChange}
        onClear={handleClear}
        creatable
      >
        {comboboxOptions}
      </Combobox>
      <Field.Error />
    </Field.Root>
  );
};
