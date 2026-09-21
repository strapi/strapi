import * as React from 'react';

import { Button, Checkbox, Flex, Modal, Typography } from '@strapi/design-system';
import { ArrowRight } from '@strapi/icons';
import { useIntl } from 'react-intl';

import { getTrad } from '../../utils/getTrad';

import { groupRenameChains, type RenameChain, type RenamePair } from './utils/groupRenameChains';

import type { RenameHop } from '../../types';

export type AttributeRenameMigrationMode =
  | 'always'
  | 'never'
  | 'prompt-after-edit'
  | 'prompt-before-save';

export type AttributeRenameDecision = boolean | 'prompt';

export const getAttributeRenameDecision = (
  mode: AttributeRenameMigrationMode
): AttributeRenameDecision => {
  if (mode === 'never') {
    return false;
  }

  if (mode === 'prompt-after-edit') {
    return 'prompt';
  }

  return true;
};

export const shouldPromptForRenamesBeforeSave = (mode: AttributeRenameMigrationMode): boolean =>
  mode === 'prompt-before-save';

/**
 * One rename *chain* on an existing type, shown as a single row in the
 * confirmation modal. Consent is given per chain, never per hop: replaying a
 * partial chain either fails or silently skips hops whose target column still
 * exists. `key` is the chain id (`${uid}:chain:${firstHopIndex}`) so a decision
 * maps back to every hop of that chain in the type's ordered `renames` array.
 */
export interface PendingRename {
  key: string;
  uid: string;
  typeName: string;
  /** Net effect of the chain (`old -> new`); the raw hops for a pure swap-back. */
  pairs: RenamePair[];
  /** Intermediate names the chain routes through (e.g. `tmp`). */
  via: string[];
  /** True when the chain's net effect is empty (fields swapped back) but data still moves. */
  isSwapBack?: boolean;
}

interface RenameMigrationModalProps {
  renames: PendingRename[];
  /**
   * Resolves with the keys of the hops the user chose to preserve (every row
   * is checked by default), or an empty set for "don't preserve data".
   */
  onConfirm: (acceptedKeys: Set<string>) => void;
  /** Aborts the current edit or save and returns to editing. */
  onCancel: () => void;
}

const RenameMigrationModal = ({ renames, onConfirm, onCancel }: RenameMigrationModalProps) => {
  const { formatMessage } = useIntl();

  const [checkedKeys, setCheckedKeys] = React.useState<Set<string>>(
    () => new Set(renames.map((rename) => rename.key))
  );

  const chainNames = (rename: PendingRename) => rename.pairs.map((pair) => pair.oldName).join(', ');

  const toggle = (key: string, checked: boolean) => {
    setCheckedKeys((previous) => {
      const next = new Set(previous);
      if (checked) {
        next.add(key);
      } else {
        next.delete(key);
      }
      return next;
    });
  };

  return (
    <Modal.Root open onOpenChange={(open) => !open && onCancel()}>
      <Modal.Content>
        <Modal.Header>
          <Typography variant="omega" fontWeight="bold">
            {formatMessage({
              id: getTrad('migration.confirmation.title'),
              defaultMessage: 'Preserve data for renamed fields?',
            })}
          </Typography>
        </Modal.Header>
        <Modal.Body>
          <Flex direction="column" alignItems="stretch" gap={4}>
            <Typography variant="omega" textColor="neutral600">
              {formatMessage({
                id: getTrad('migration.confirmation.description'),
                defaultMessage:
                  'You renamed the fields below. Strapi can generate a migration to preserve existing data by renaming the underlying database columns. Untick a rename to let those fields start empty instead.',
              })}
            </Typography>
            <Flex direction="column" alignItems="stretch" gap={2}>
              {renames.map((rename) => (
                <Flex
                  key={rename.key}
                  justifyContent="space-between"
                  alignItems="center"
                  hasRadius
                  borderColor="neutral200"
                  padding={3}
                  gap={3}
                >
                  <Flex direction="column" alignItems="start" gap={1}>
                    {rename.pairs.map((pair) => (
                      <Flex key={`${pair.oldName}->${pair.newName}`} gap={2} alignItems="center">
                        <Typography variant="omega" fontWeight="bold">
                          {pair.oldName}
                        </Typography>
                        <ArrowRight width="1.2rem" height="1.2rem" fill="neutral500" />
                        <Typography variant="omega" fontWeight="bold">
                          {pair.newName}
                        </Typography>
                      </Flex>
                    ))}
                    {rename.isSwapBack && (
                      <Typography variant="pi" textColor="neutral600">
                        {formatMessage({
                          id: getTrad('migration.confirmation.field.swap'),
                          defaultMessage:
                            'Fields swapped back to their original names; data still moves.',
                        })}
                      </Typography>
                    )}
                    {rename.via.length > 0 && (
                      <Typography variant="pi" textColor="neutral600">
                        {formatMessage(
                          {
                            id: getTrad('migration.confirmation.field.via'),
                            defaultMessage: 'via {names}',
                          },
                          { names: rename.via.join(', ') }
                        )}
                      </Typography>
                    )}
                    <Typography variant="pi" textColor="neutral600">
                      {formatMessage(
                        {
                          id: getTrad('migration.confirmation.field.in'),
                          defaultMessage: 'in {typeName}',
                        },
                        { typeName: rename.typeName }
                      )}
                    </Typography>
                  </Flex>
                  <Checkbox
                    aria-label={formatMessage(
                      {
                        id: getTrad('migration.confirmation.field.preserve'),
                        defaultMessage: 'Preserve data of {names}',
                      },
                      { names: chainNames(rename) }
                    )}
                    checked={checkedKeys.has(rename.key)}
                    onCheckedChange={(checked) => toggle(rename.key, checked === true)}
                  />
                </Flex>
              ))}
            </Flex>
          </Flex>
        </Modal.Body>
        <Modal.Footer>
          <Modal.Close>
            <Button variant="tertiary" onClick={onCancel}>
              {formatMessage({
                id: getTrad('migration.confirmation.cancel'),
                defaultMessage: 'Cancel',
              })}
            </Button>
          </Modal.Close>
          <Button variant="secondary" onClick={() => onConfirm(new Set())}>
            {formatMessage({
              id: getTrad('migration.confirmation.decline'),
              defaultMessage: "Don't preserve data",
            })}
          </Button>
          <Button disabled={checkedKeys.size === 0} onClick={() => onConfirm(checkedKeys)}>
            {formatMessage({
              id: getTrad('migration.confirmation.confirm'),
              defaultMessage: 'Preserve data',
            })}
          </Button>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
};

export { RenameMigrationModal };

const getTypeName = (entry: { displayName?: string; uid: string }): string =>
  entry.displayName ?? entry.uid;

type RenameAwareEntry = {
  action?: string;
  uid: string;
  displayName?: string;
  renames?: RenameHop[];
};

/**
 * Builds the modal row for one chain. A chain whose net effect is empty (the
 * user renamed fields back to their original names through a swap) still has
 * to run every hop, so its raw hops are shown instead of an empty row.
 */
export const toPendingRename = (
  chain: RenameChain,
  renames: RenameHop[],
  { uid, typeName }: { uid: string; typeName: string }
): PendingRename => {
  const isSwapBack = chain.pairs.length === 0;

  return {
    key: chain.id,
    uid,
    typeName,
    pairs: isSwapBack ? chain.hopIndexes.map((index) => renames[index]) : chain.pairs,
    via: chain.via,
    ...(isSwapBack ? { isSwapBack: true } : {}),
  };
};

/**
 * Groups the ordered per-type `renames` arrays in a request payload into
 * chains for display, one `PendingRename` per chain, preserving order.
 */
export const collectPendingRenames = (requestData: {
  contentTypes: RenameAwareEntry[];
  components: RenameAwareEntry[];
}): PendingRename[] => {
  const items: PendingRename[] = [];

  const visit = (entries: RenameAwareEntry[]) => {
    entries.forEach((entry) => {
      if (entry.action === 'update' && Array.isArray(entry.renames)) {
        const { renames } = entry;
        groupRenameChains(entry.uid, renames).forEach((chain) => {
          items.push(
            toPendingRename(chain, renames, { uid: entry.uid, typeName: getTypeName(entry) })
          );
        });
      }
    });
  };

  visit(requestData.contentTypes ?? []);
  visit(requestData.components ?? []);

  return items;
};

/**
 * Keeps only the hops of `renames` that belong to an accepted chain. Filtering
 * by index preserves the original order, and a chain is always kept or dropped
 * as a whole, so the result can never be a truncated chain.
 */
export const filterRenamesByAcceptedChains = (
  uid: string,
  renames: RenameHop[],
  acceptedChainIds: Set<string>
): RenameHop[] => {
  const keptIndexes = new Set<number>();
  groupRenameChains(uid, renames).forEach((chain) => {
    if (acceptedChainIds.has(chain.id)) {
      chain.hopIndexes.forEach((index) => keptIndexes.add(index));
    }
  });

  return renames.filter((_, index) => keptIndexes.has(index));
};

/**
 * Mutates the request payload so each type keeps only the rename chains the
 * user accepted; types left with no accepted hops drop their `renames` entirely.
 */
export const applyRenameDecisions = (
  requestData: { contentTypes: RenameAwareEntry[]; components: RenameAwareEntry[] },
  acceptedKeys: Set<string>
): void => {
  const apply = (entries: RenameAwareEntry[]) => {
    entries.forEach((entry) => {
      if (entry.action === 'update' && Array.isArray(entry.renames)) {
        const kept = filterRenamesByAcceptedChains(entry.uid, entry.renames, acceptedKeys);
        if (kept.length > 0) {
          entry.renames = kept;
        } else {
          delete entry.renames;
        }
      }
    });
  };

  apply(requestData.contentTypes ?? []);
  apply(requestData.components ?? []);
};
