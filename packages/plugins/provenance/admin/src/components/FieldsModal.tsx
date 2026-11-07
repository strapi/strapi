import { Box, Button, Divider, Flex, Modal, TextButton, Typography } from '@strapi/design-system';
import { CheckCircle, Download, Sparkle } from '@strapi/icons';
import { useIntl } from 'react-intl';

import { isAiSource } from '../constants';
import { getTranslation } from '../utils/translations';

import { SourceBadge } from './SourceBadge';

import type { FieldProvenance } from '../constants';

export type PendingPaste = {
  field: string;
  /** `ai` once the editor said so but the pasted value is not saved yet */
  decision: 'undecided' | 'ai';
};

const FieldRow = ({
  name,
  field,
  canEdit,
  onDeclareAi,
}: {
  name: string;
  field: FieldProvenance;
  canEdit: boolean;
  onDeclareAi: (name: string) => void;
}) => {
  const { formatMessage } = useIntl();
  const details = [field.model, field.agent].filter(Boolean).join(' · ');

  let reviewText: string;

  if (field.review) {
    reviewText = formatMessage(
      { id: getTranslation('panel.reviewed-by'), defaultMessage: 'Reviewed by {name}' },
      { name: field.review.by ?? `#${field.review.byId}` }
    );
  } else if (field.reviewOutdated) {
    reviewText = formatMessage({
      id: getTranslation('panel.review-outdated'),
      defaultMessage: 'Changed since review',
    });
  } else {
    reviewText = formatMessage({
      id: getTranslation('panel.not-reviewed'),
      defaultMessage: 'Not reviewed',
    });
  }

  return (
    <Flex justifyContent="space-between" gap={4} paddingTop={3} paddingBottom={3}>
      <Flex direction="column" alignItems="stretch" gap={1} minWidth={0}>
        <Typography variant="omega" fontWeight="semiBold" ellipsis>
          {name}
        </Typography>
        <Typography
          variant="pi"
          textColor={!field.review && isAiSource(field.source) ? 'warning600' : 'neutral600'}
          ellipsis
        >
          {details !== '' ? `${details} · ${reviewText}` : reviewText}
        </Typography>
      </Flex>
      <Flex gap={3} shrink={0}>
        {canEdit && !isAiSource(field.source) ? (
          <TextButton onClick={() => onDeclareAi(name)} startIcon={<Sparkle />}>
            {formatMessage({
              id: getTranslation('panel.declare-ai'),
              defaultMessage: 'Mark as AI',
            })}
          </TextButton>
        ) : null}
        <SourceBadge source={field.source} />
      </Flex>
    </Flex>
  );
};

const PastedRow = ({
  pending,
  canEdit,
  onQualify,
}: {
  pending: PendingPaste;
  canEdit: boolean;
  onQualify: (field: string, decision: 'ai' | 'other' | 'undo') => void;
}) => {
  const { formatMessage } = useIntl();

  return (
    <Flex justifyContent="space-between" gap={4}>
      <Flex direction="column" alignItems="stretch" gap={1} minWidth={0}>
        <Typography variant="omega" fontWeight="semiBold" ellipsis>
          {pending.field}
        </Typography>
        <Typography variant="pi" textColor="neutral600">
          {pending.decision === 'ai'
            ? formatMessage({
                id: getTranslation('paste.queued'),
                defaultMessage: 'Will be marked as AI when you save',
              })
            : formatMessage({
                id: getTranslation('paste.question'),
                defaultMessage: 'Pasted text. Did it come from an AI assistant?',
              })}
        </Typography>
      </Flex>
      {pending.decision === 'ai' ? (
        <TextButton onClick={() => onQualify(pending.field, 'undo')}>
          {formatMessage({ id: getTranslation('paste.undo'), defaultMessage: 'Undo' })}
        </TextButton>
      ) : (
        <Flex gap={2} shrink={0}>
          <Button
            size="S"
            variant="secondary"
            startIcon={<Sparkle />}
            disabled={!canEdit}
            onClick={() => onQualify(pending.field, 'ai')}
          >
            {formatMessage({ id: getTranslation('paste.ai'), defaultMessage: 'AI' })}
          </Button>
          <Button size="S" variant="tertiary" onClick={() => onQualify(pending.field, 'other')}>
            {formatMessage({ id: getTranslation('paste.other'), defaultMessage: 'Other source' })}
          </Button>
        </Flex>
      )}
    </Flex>
  );
};

export const FieldsModal = ({
  open,
  onOpenChange,
  fields,
  pending,
  canEdit,
  isSubmitting,
  onDeclareAi,
  onQualifyPaste,
  onExport,
  onReviewAll,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fields: Array<[string, FieldProvenance]>;
  pending: PendingPaste[];
  canEdit: boolean;
  isSubmitting: boolean;
  onDeclareAi: (field: string) => void;
  onQualifyPaste: (field: string, decision: 'ai' | 'other' | 'undo') => void;
  onExport: () => void;
  onReviewAll: () => void;
}) => {
  const { formatMessage } = useIntl();

  return (
    <Modal.Root open={open} onOpenChange={onOpenChange}>
      <Modal.Content>
        <Modal.Header>
          <Modal.Title>
            {formatMessage({
              id: getTranslation('modal.title'),
              defaultMessage: 'Field provenance',
            })}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Flex direction="column" alignItems="stretch" gap={6}>
            {pending.length > 0 ? (
              <Box background="warning100" borderColor="warning200" hasRadius padding={4}>
                <Flex direction="column" alignItems="stretch" gap={3}>
                  <Typography variant="sigma" textColor="warning700">
                    {formatMessage({
                      id: getTranslation('paste.section'),
                      defaultMessage: 'Pasted content to qualify',
                    })}
                  </Typography>
                  {pending.map((item) => (
                    <PastedRow
                      key={item.field}
                      pending={item}
                      canEdit={canEdit && !isSubmitting}
                      onQualify={onQualifyPaste}
                    />
                  ))}
                </Flex>
              </Box>
            ) : null}

            {fields.length === 0 ? (
              <Typography variant="pi" textColor="neutral600">
                {formatMessage({
                  id: getTranslation('panel.empty'),
                  defaultMessage: 'No content yet.',
                })}
              </Typography>
            ) : (
              <Flex direction="column" alignItems="stretch">
                {fields.map(([name, field], index) => (
                  <Box key={name}>
                    {index > 0 ? <Divider /> : null}
                    <FieldRow
                      name={name}
                      field={field}
                      canEdit={canEdit && !isSubmitting}
                      onDeclareAi={onDeclareAi}
                    />
                  </Box>
                ))}
              </Flex>
            )}
          </Flex>
        </Modal.Body>
        <Modal.Footer>
          <Modal.Close>
            <Button variant="tertiary">
              {formatMessage({ id: 'app.components.Button.cancel', defaultMessage: 'Close' })}
            </Button>
          </Modal.Close>
          <Flex gap={2}>
            {fields.length > 0 ? (
              <Button
                variant="secondary"
                startIcon={<Download />}
                onClick={onExport}
                title={formatMessage({
                  id: getTranslation('modal.export.hint'),
                  defaultMessage:
                    "JSON file with each field's source, its IPTC term and who reviewed it. Not signed.",
                })}
              >
                {formatMessage({
                  id: getTranslation('modal.export'),
                  defaultMessage: 'Export provenance record',
                })}
              </Button>
            ) : null}
            {canEdit && fields.length > 0 ? (
              <Button
                startIcon={<CheckCircle />}
                loading={isSubmitting}
                onClick={onReviewAll}
                title={formatMessage({
                  id: getTranslation('panel.review-all.hint'),
                  defaultMessage:
                    'Records you as the reviewer of these exact values. Changing a value cancels the review.',
                })}
              >
                {formatMessage({
                  id: getTranslation('panel.review-all'),
                  defaultMessage: 'Confirm I reviewed all fields',
                })}
              </Button>
            ) : null}
          </Flex>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
};
