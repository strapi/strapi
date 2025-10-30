import { tours } from '@strapi/admin/strapi-admin';
import { Button, Box, Flex, Typography } from '@strapi/design-system';
import { Sparkle, Paperclip } from '@strapi/icons';
import { EmptyDocuments } from '@strapi/icons/symbols';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { FigmaIcon } from '../../components/AIChat/components/icons/FigmaIcon';
import { useStrapiChat } from '../../components/AIChat/providers/ChatProvider';
import { useUploadProjectToChat } from '../../components/AIChat/UploadCodeModal';
import { useUploadFigmaToChat } from '../../components/AIChat/UploadFigmaModal';
import { getTrad } from '../../utils/getTrad';

// Styled container that implements responsive behavior
const ResponsiveContainer = styled(Flex)`
  @container (max-width: 200px) {
    .hide-on-small {
      display: none;
    }
  }
  container-type: inline-size;
`;

export const EmptyState = () => {
  const { formatMessage } = useIntl();

  const pluginName = formatMessage({
    id: getTrad('table.content.create-first-content-type.title'),
    defaultMessage: 'No content types',
  });

  const { isChatEnabled, openChat } = useStrapiChat();
  const { openCodeUpload } = useUploadProjectToChat();
  const { openFigmaUpload } = useUploadFigmaToChat();

  return (
    <ResponsiveContainer
      justifyContent="center"
      height="100%"
      width={'400px'}
      maxWidth="90%"
      margin="auto"
      direction="column"
      gap={6}
    >
      <EmptyDocuments width="160px" height="88px" />
      <tours.contentTypeBuilder.Introduction>
        {/* Invisible Anchor */}
        <Box />
      </tours.contentTypeBuilder.Introduction>
      <Flex gap={2} alignItems="center" direction="column">
        <Typography variant="beta" textAlign="center">
          {pluginName}
        </Typography>
        <Typography variant="omega" textAlign="center" textColor="neutral600">
          {formatMessage({
            id: getTrad('table.content.create-first-content-type.description'),
            defaultMessage:
              'Create collection types, single types and components in order to build your schema.',
          })}
        </Typography>
      </Flex>

      {/* Chat is not available on small screens either way */}
      {isChatEnabled && (
        <Flex gap={2} direction="column" className="hide-on-small">
          <Button
            startIcon={<FigmaIcon />}
            variant="tertiary"
            onClick={() => openFigmaUpload(true)}
          >
            {formatMessage({
              id: getTrad('table.content.create-first-content-type.import-figma'),
              defaultMessage: 'Import from Figma',
            })}
          </Button>
          <Button startIcon={<Paperclip />} variant="tertiary" onClick={() => openCodeUpload(true)}>
            {formatMessage({
              id: getTrad('table.content.create-first-content-type.import-code'),
              defaultMessage: 'Import from computer',
            })}
          </Button>
          <Button startIcon={<Sparkle />} variant="tertiary" onClick={openChat}>
            {formatMessage({
              id: getTrad('table.content.create-first-content-type.start-with-prompt'),
              defaultMessage: 'Start with a prompt',
            })}
          </Button>
        </Flex>
      )}
    </ResponsiveContainer>
  );
};
