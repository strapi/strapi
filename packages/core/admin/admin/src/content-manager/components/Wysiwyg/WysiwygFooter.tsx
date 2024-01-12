import { BaseButtonProps, Box, Flex, Typography } from '@strapi/design-system';
import { Expand } from '@strapi/icons';
import { useIntl } from 'react-intl';

import { ExpandButton } from './WysiwygStyles';

interface WysiwygFooterProps {
  onToggleExpand: BaseButtonProps['onClick'];
}

const WysiwygFooter = ({ onToggleExpand }: WysiwygFooterProps) => {
  const { formatMessage } = useIntl();

  return (
    <Box padding={2} background="neutral100" borderRadius={`0 0 ${4 / 16}rem ${4 / 16}rem`}>
      <Flex justifyContent="flex-end" alignItems="flex-end">
        <ExpandButton id="expand" onClick={onToggleExpand}>
          <Typography>
            {formatMessage({
              id: 'components.WysiwygBottomControls.fullscreen',
              defaultMessage: 'Expand',
            })}
          </Typography>
          <Expand />
        </ExpandButton>
      </Flex>
    </Box>
  );
};

export { WysiwygFooter };
export type { WysiwygFooterProps };
