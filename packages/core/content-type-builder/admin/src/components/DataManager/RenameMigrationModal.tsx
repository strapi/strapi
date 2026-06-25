import * as React from 'react';

import { Button, Checkbox, Flex, Modal, Typography } from '@strapi/design-system';
import { ArrowRight } from '@strapi/icons';
import { useIntl } from 'react-intl';

import { getTrad } from '../../utils/getTrad';

/**
 * A single rename hop the user performed on an existing field, shown in the
 * confirmation modal. `key` is `${uid}:${hopIndex}` so a decision maps back to
 * the exact entry in that type's ordered `renames` array.
 */
export interface PendingRename {
  key: string;
  uid: string;
  typeName: string;
  oldName: string;
  newName: string;
}

interface RenameMigrationModalProps {
  renames: PendingRename[];
  /** Resolves with the set of accepted hop keys (migration is generated for those). */
  onConfirm: (acceptedKeys: Set<string>) => void;
  /** Aborts the whole save and returns to editing. */
  onCancel: () => void;
}

const RenameMigrationModal = ({ renames, onConfirm, onCancel }: RenameMigrationModalProps) => {
  const { formatMessage } = useIntl();

  // Default: generate a migration for every rename (the data-preserving choice).
  const [accepted, setAccepted] = React.useState<Set<string>>(
    () => new Set(renames.map((rename) => rename.key))
  );

  const toggle = (key: string) => {
    setAccepted((previous) => {
      const next = new Set(previous);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
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
                  'You renamed the fields below. Keeping a rename selected generates a migration that preserves existing data by renaming the underlying database column. Clearing a rename lets the field be dropped and recreated empty.',
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
                    <Flex gap={2} alignItems="center">
                      <Typography variant="omega" fontWeight="bold">
                        {rename.oldName}
                      </Typography>
                      <ArrowRight width="1.2rem" height="1.2rem" fill="neutral500" />
                      <Typography variant="omega" fontWeight="bold">
                        {rename.newName}
                      </Typography>
                    </Flex>
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
                    name={`rename-${rename.key}`}
                    checked={accepted.has(rename.key)}
                    onCheckedChange={() => toggle(rename.key)}
                  >
                    {formatMessage({
                      id: getTrad('migration.confirmation.field.preserve'),
                      defaultMessage: 'Preserve data',
                    })}
                  </Checkbox>
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
          <Button onClick={() => onConfirm(accepted)}>
            {formatMessage({
              id: getTrad('migration.confirmation.confirm'),
              defaultMessage: 'Save',
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
  renames?: Array<{ oldName: string; newName: string }>;
};

/**
 * Flattens the ordered per-type `renames` arrays in a request payload into a flat
 * list of hops for display, preserving order. Keyed by `${uid}:${index}` so a
 * decision can be applied back to the exact array slot.
 */
export const collectPendingRenames = (requestData: {
  contentTypes: RenameAwareEntry[];
  components: RenameAwareEntry[];
}): PendingRename[] => {
  const items: PendingRename[] = [];

  const visit = (entries: RenameAwareEntry[]) => {
    entries.forEach((entry) => {
      if (entry.action === 'update' && Array.isArray(entry.renames)) {
        entry.renames.forEach((hop, index) => {
          items.push({
            key: `${entry.uid}:${index}`,
            uid: entry.uid,
            typeName: getTypeName(entry),
            oldName: hop.oldName,
            newName: hop.newName,
          });
        });
      }
    });
  };

  visit(requestData.contentTypes ?? []);
  visit(requestData.components ?? []);

  return items;
};

/**
 * Mutates the request payload so each type keeps only the rename hops the user
 * accepted; types left with no accepted hops drop their `renames` entirely.
 */
export const applyRenameDecisions = (
  requestData: { contentTypes: RenameAwareEntry[]; components: RenameAwareEntry[] },
  acceptedKeys: Set<string>
): void => {
  const apply = (entries: RenameAwareEntry[]) => {
    entries.forEach((entry) => {
      if (entry.action === 'update' && Array.isArray(entry.renames)) {
        const kept = entry.renames.filter((_, index) => acceptedKeys.has(`${entry.uid}:${index}`));
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
