import { ReactNode } from 'react';

import { Box, Flex, Typography } from '@strapi/design-system';
import { Trash } from '@strapi/icons';
import { styled } from 'styled-components';

/* -------------------------------------------------------------------------------------------------
 * Attachment Root
 * -----------------------------------------------------------------------------------------------*/

interface AttachmentRootProps {
  children: ReactNode;
}

const StyledRoot = styled(Box)`
  &:hover {
    cursor: pointer;
    background: ${({ theme }) => theme.colors.neutral100};
  }
`;

// TODO: How to make this a button instead?
const Root = ({ children }: AttachmentRootProps) => {
  return (
    <StyledRoot
      background="neutral0"
      hasRadius
      borderColor="neutral200"
      borderStyle="solid"
      borderWidth="1px"
      padding={2}
    >
      <Flex gap={2}>{children}</Flex>
    </StyledRoot>
  );
};

/* -------------------------------------------------------------------------------------------------
 * Attachment Preview
 * -----------------------------------------------------------------------------------------------*/

interface AttachmentPreviewProps {
  children: ReactNode;
}

const Preview = ({ children }: AttachmentPreviewProps) => {
  return (
    <Flex alignItems="center" justifyContent="center" shrink={0}>
      {children}
    </Flex>
  );
};

/* -------------------------------------------------------------------------------------------------
 * Attachment Title
 * -----------------------------------------------------------------------------------------------*/

interface AttachmentTitleProps {
  children: ReactNode;
}

const Title = ({ children }: AttachmentTitleProps) => {
  return (
    <Box grow={1}>
      <Typography variant="omega" ellipsis style={{ userSelect: 'none', maxWidth: '100px' }}>
        {children}
      </Typography>
    </Box>
  );
};

/* -------------------------------------------------------------------------------------------------
 * Attachment Remove
 * -----------------------------------------------------------------------------------------------*/

interface AttachmentRemoveProps {
  onClick: () => void;
}

const Remove = ({ onClick }: AttachmentRemoveProps) => {
  return (
    <Flex alignItems="center" justifyContent="center" shrink={0} onClick={onClick}>
      <Trash fill="neutral500" />
    </Flex>
  );
};

/* -------------------------------------------------------------------------------------------------
 * Attachment Compound
 * -----------------------------------------------------------------------------------------------*/

export const Attachment = {
  Root,
  Preview,
  Title,
  Remove,
};
