import { Box, Button, Flex, IconButton, TextButton, Typography } from '@strapi/design-system';
import { Cross, Sparkle } from '@strapi/icons';
import { createPortal } from 'react-dom';
import { useIntl } from 'react-intl';

import { getTranslation } from '../utils/translations';

/**
 * Asks where pasted text comes from, in a card fixed to the bottom right of the edit view,
 * so the editor does not have to scroll to the Provenance panel.
 */
export const PastePrompt = ({
  fields,
  disabled,
  onQualify,
  onOpenDetails,
}: {
  fields: string[];
  disabled: boolean;
  onQualify: (decision: 'ai' | 'other') => void;
  onOpenDetails: () => void;
}) => {
  const { formatMessage, formatList } = useIntl();

  if (fields.length === 0) {
    return null;
  }

  const otherLabel = formatMessage({
    id: getTranslation('paste.other'),
    defaultMessage: 'Other source',
  });

  return createPortal(
    <Box
      position="fixed"
      bottom={6}
      right={6}
      zIndex={3}
      width="36rem"
      maxWidth="calc(100vw - 4.8rem)"
      background="neutral0"
      borderColor="warning200"
      hasRadius
      shadow="popupShadow"
      padding={4}
      role="dialog"
      aria-labelledby="provenance-paste-title"
    >
      <Flex direction="column" alignItems="stretch" gap={3}>
        <Flex justifyContent="space-between" alignItems="flex-start" gap={2}>
          <Flex direction="column" alignItems="stretch" gap={1}>
            <Typography id="provenance-paste-title" variant="omega" fontWeight="bold">
              {formatMessage({ id: getTranslation('paste.title'), defaultMessage: 'Pasted text' })}
            </Typography>
            <Typography variant="pi" textColor="neutral600">
              {formatMessage(
                {
                  id: getTranslation('paste.prompt'),
                  defaultMessage: 'Did the text pasted in {fields} come from an AI assistant?',
                },
                { fields: formatList(fields) }
              )}
            </Typography>
          </Flex>
          <IconButton
            label={formatMessage({
              id: getTranslation('paste.dismiss'),
              defaultMessage: 'Dismiss',
            })}
            variant="ghost"
            onClick={() => onQualify('other')}
          >
            <Cross />
          </IconButton>
        </Flex>
        <Flex justifyContent="space-between" alignItems="center" gap={2}>
          <TextButton onClick={onOpenDetails}>
            {formatMessage({
              id: getTranslation('paste.details'),
              defaultMessage: 'Field by field',
            })}
          </TextButton>
          <Flex gap={2}>
            <Button size="S" variant="tertiary" onClick={() => onQualify('other')}>
              {otherLabel}
            </Button>
            <Button
              size="S"
              variant="secondary"
              startIcon={<Sparkle />}
              disabled={disabled}
              onClick={() => onQualify('ai')}
            >
              {formatMessage({ id: getTranslation('paste.ai'), defaultMessage: 'AI' })}
            </Button>
          </Flex>
        </Flex>
      </Flex>
    </Box>,
    document.body
  );
};
