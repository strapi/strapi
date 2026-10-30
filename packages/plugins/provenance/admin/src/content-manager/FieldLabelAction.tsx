import { Badge, Flex, Tooltip } from '@strapi/design-system';
import { Cross, Sparkle } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { isAiSource } from '../constants';
import { useFieldsStore } from '../store/fields';
import { getTranslation } from '../utils/translations';

const SOURCE_LABELS = {
  'ai-generated': 'AI generated',
  'ai-assisted': 'AI assisted',
} as const;

/**
 * Next to a field label: the AI badge of the field, or a button to mark it as AI. Renders
 * nothing outside the edit view of an existing entry of a tracked content type.
 */
export const FieldLabelAction = ({ name }: { name: string }) => {
  const { formatMessage } = useIntl();
  const store = useFieldsStore();
  const field = store?.provenance.fields[name];

  if (!store || !field) {
    return null;
  }

  const pending = store.pending.find((item) => item.field === name);
  // Permissions name the fields inside a component (`seo.metaTitle`), not the component
  const canEdit =
    store.canEdit &&
    store.canUpdateFields.some((path) => path === name || path.startsWith(`${name}.`));
  const disabled = !canEdit || store.isSubmitting;

  if (pending?.decision === 'ai') {
    const label = formatMessage({
      id: getTranslation('field.queued'),
      defaultMessage: 'Marked as AI when you save. Click to cancel.',
    });

    return (
      <Tooltip label={label}>
        <ChipButton type="button" aria-label={label} onClick={() => store.cancel(name)}>
          <Badge size="S" variant="alternative">
            {formatMessage({
              id: getTranslation('field.queued.badge'),
              defaultMessage: 'AI on save',
            })}
          </Badge>
          <Cross aria-hidden />
        </ChipButton>
      </Tooltip>
    );
  }

  if (isAiSource(field.source)) {
    const details = [field.model, field.agent].filter(Boolean).join(' · ');
    const review = field.review
      ? formatMessage(
          { id: getTranslation('panel.reviewed-by'), defaultMessage: 'Reviewed by {name}' },
          { name: field.review.by ?? `#${field.review.byId}` }
        )
      : formatMessage({ id: getTranslation('panel.not-reviewed'), defaultMessage: 'Not reviewed' });

    return (
      <Tooltip label={details !== '' ? `${details} · ${review}` : review}>
        {/* The Badge does not forward refs: the tooltip needs an element to anchor to */}
        <BadgeAnchor tabIndex={0} aria-label={review}>
          <Badge size="S" variant={field.review ? 'alternative' : 'warning'}>
            {formatMessage({
              id: getTranslation(`source.${field.source}`),
              defaultMessage: SOURCE_LABELS[field.source as keyof typeof SOURCE_LABELS],
            })}
          </Badge>
        </BadgeAnchor>
      </Tooltip>
    );
  }

  if (!canEdit) {
    return null;
  }

  const label = formatMessage(
    pending?.decision === 'undecided'
      ? {
          id: getTranslation('field.pasted'),
          defaultMessage: 'Pasted text: mark it as AI',
        }
      : { id: getTranslation('panel.declare-ai'), defaultMessage: 'Mark as AI' }
  );

  return (
    <Tooltip label={label}>
      <MarkButton
        type="button"
        aria-label={label}
        disabled={disabled}
        $highlighted={pending?.decision === 'undecided'}
        onClick={() => store.markAsAi(name)}
      >
        <Sparkle aria-hidden />
        {pending?.decision === 'undecided'
          ? formatMessage({ id: getTranslation('field.pasted.short'), defaultMessage: 'AI?' })
          : null}
      </MarkButton>
    </Tooltip>
  );
};

const BadgeAnchor = styled.span`
  display: inline-flex;
  flex-shrink: 0;
`;

const ChipButton = styled.button`
  display: inline-flex;
  flex-shrink: 0;
  white-space: nowrap;
  align-items: center;
  gap: ${({ theme }) => theme.spaces[1]};
  border: none;
  background: none;
  padding: 0;
  cursor: pointer;

  svg {
    flex-shrink: 0;
    width: 1rem;
    height: 1rem;
    fill: ${({ theme }) => theme.colors.neutral500};
  }
`;

const MarkButton = styled.button<{ $highlighted: boolean }>`
  display: inline-flex;
  flex-shrink: 0;
  white-space: nowrap;
  align-items: center;
  gap: ${({ theme }) => theme.spaces[1]};
  border: none;
  border-radius: ${({ theme }) => theme.borderRadius};
  padding: ${({ $highlighted, theme }) => ($highlighted ? `0 ${theme.spaces[1]}` : 0)};
  background: ${({ $highlighted, theme }) => ($highlighted ? theme.colors.warning100 : 'none')};
  color: ${({ theme }) => theme.colors.warning700};
  font-size: 1.2rem;
  font-weight: 600;
  cursor: pointer;

  svg {
    width: 1.2rem;
    height: 1.2rem;
    fill: ${({ $highlighted, theme }) =>
      $highlighted ? theme.colors.warning600 : theme.colors.neutral400};
  }

  &:hover:not(:disabled) svg,
  &:focus-visible svg {
    fill: ${({ theme }) => theme.colors.primary600};
  }

  &:disabled {
    cursor: not-allowed;
  }
`;

/**
 * Keeps another plugin's label action (i18n's globe) next to ours.
 */
export const withFieldLabelAction = (name: string, existing: React.ReactNode) => (
  <Flex tag="span" gap={1} alignItems="center">
    {existing}
    <FieldLabelAction name={name} />
  </Flex>
);
