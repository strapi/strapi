import * as React from 'react';

import { Alert, Box, Button, Flex, Modal, Typography } from '@strapi/design-system';
import { Check } from '@strapi/icons';
import { useIntl } from 'react-intl';

import { getTranslation } from '../../../utils/getTranslation';

import type { ChangeGroup } from '../utils/editorModel';
import type { SelfWritableWarning } from '../utils/selfWritableWarnings';

type Change = ChangeGroup['changes'][number];

/** What a change did: `from → to`, or the values it added (`+`) and removed (`−`) */
const ChangeValue = ({ change }: { change: Change }) => {
  if (change.added || change.removed) {
    return (
      <Flex direction="column" alignItems="flex-start">
        {change.added && (
          <Typography variant="omega" fontWeight="bold" textColor="success600">
            {`+ ${change.added.join(', ')}`}
          </Typography>
        )}
        {change.removed && (
          <Typography variant="omega" fontWeight="bold" textColor="danger600">
            {`− ${change.removed.join(', ')}`}
          </Typography>
        )}
      </Flex>
    );
  }

  return (
    <Typography variant="omega" textColor="neutral600">
      {change.from}
      {' → '}
      <Typography variant="omega" fontWeight="bold" textColor="neutral800">
        {change.to}
      </Typography>
    </Typography>
  );
};

interface ReviewChangesModalProps {
  /** "Review changes · <role>" */
  title: string;
  /** What changes, a group for the role and for each content type or route group it touches */
  groups: ChangeGroup[];
  /** Fields a builder condition reads that this save lets users write themselves */
  warnings?: SelfWritableWarning[];
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * What a save is about to do, listed before it does it: nothing is sent until the admin confirms.
 * It is open for as long as it is rendered, so whoever renders it decides when.
 */
const ReviewChangesModal = ({
  title,
  groups,
  warnings = [],
  onConfirm,
  onCancel,
}: ReviewChangesModalProps) => {
  const { formatMessage } = useIntl();

  return (
    <Modal.Root
      open
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          onCancel();
        }
      }}
    >
      <Modal.Content>
        <Modal.Header>
          <Modal.Title>{title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Flex direction="column" alignItems="stretch" gap={6}>
            {warnings.length > 0 && (
              <Alert
                variant="warning"
                closeLabel={formatMessage({ id: 'global.close', defaultMessage: 'Close' })}
                title={formatMessage({
                  id: getTranslation('roles.review.self-writable.title'),
                  defaultMessage: 'Users could satisfy these conditions themselves',
                })}
              >
                {warnings.map(({ condition, displayName, field }) => (
                  <Typography key={`${condition}:${field}`} tag="span" display="block">
                    {formatMessage(
                      {
                        id: getTranslation('roles.review.self-writable.item'),
                        defaultMessage:
                          'This save lets users write <b>{field}</b>, which the condition <b>{condition}</b> reads.',
                      },
                      {
                        field,
                        condition: displayName,
                        b: (chunks: React.ReactNode) => (
                          <Typography fontWeight="bold">{chunks}</Typography>
                        ),
                      }
                    )}
                  </Typography>
                ))}
              </Alert>
            )}
            {groups.map(({ group, changes }) => (
              <Box key={group} tag="section" aria-label={group}>
                <Typography tag="h3" variant="sigma" textColor="neutral600">
                  {group}
                </Typography>
                <Flex tag="ul" direction="column" alignItems="stretch" gap={2} paddingTop={2}>
                  {changes.map((change) => (
                    <Flex
                      key={change.label}
                      tag="li"
                      justifyContent="space-between"
                      alignItems="flex-start"
                      gap={4}
                    >
                      <Typography variant="omega" textColor="neutral800">
                        {change.label}
                      </Typography>
                      <Box>
                        <ChangeValue change={change} />
                      </Box>
                    </Flex>
                  ))}
                </Flex>
              </Box>
            ))}
          </Flex>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="tertiary" type="button" onClick={onCancel}>
            {formatMessage({ id: 'app.components.Button.cancel', defaultMessage: 'Cancel' })}
          </Button>
          <Button startIcon={<Check />} type="button" onClick={onConfirm}>
            {formatMessage({ id: 'global.save', defaultMessage: 'Save' })}
          </Button>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
};

export { ReviewChangesModal };
export type { ReviewChangesModalProps };
