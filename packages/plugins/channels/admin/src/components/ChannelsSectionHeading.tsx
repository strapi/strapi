import { Box, Divider, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { getTranslation } from '../utils/getTranslation';

/**
 * Separates the channel settings from the rest of the Content-Type Builder's
 * advanced settings, like the Workspaces section does. Rendered as a form
 * item of its own (full width, no field of its own).
 */
export const ChannelsSectionHeading = () => {
  const { formatMessage } = useIntl();

  return (
    <Box paddingTop={4} paddingBottom={2}>
      <Divider marginBottom={4} />
      <Typography variant="delta" tag="h3">
        {formatMessage({
          id: getTranslation('ctb.section.title'),
          defaultMessage: 'Channels',
        })}
      </Typography>
    </Box>
  );
};
