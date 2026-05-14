import { ReactNode, createContext, useContext } from 'react';

import { Box, Flex, Typography } from '@strapi/design-system';
import { Trash, WarningCircle } from '@strapi/icons';
import { styled } from 'styled-components';

/* -------------------------------------------------------------------------------------------------
 * Attachment Context
 * -----------------------------------------------------------------------------------------------*/

interface AttachmentContextValue {
  error?: string | null;
}

const AttachmentContext = createContext<AttachmentContextValue>({ error: null });

const useAttachmentContext = () => useContext(AttachmentContext);

/* -------------------------------------------------------------------------------------------------
 * Attachment Root
 * -----------------------------------------------------------------------------------------------*/

export interface AttachmentRootProps {
  children: ReactNode;
  error?: string | null;
  minWidth?: string;
  maxWidth?: string;
}

const StyledRoot = styled(Box)`
  &:hover {
    cursor: pointer;
    background: ${({ theme }) => theme.colors.neutral100};
  }
`;

// TODO: How to make this a button instead?
const Root = ({ children, error = null, minWidth, maxWidth }: AttachmentRootProps) => {
  return (
    <AttachmentContext.Provider value={{ error }}>
      <Flex
        direction="column"
        alignItems="flex-start"
        gap={2}
        minWidth={minWidth}
        maxWidth={maxWidth}
      >
        <StyledRoot
          background="neutral0"
          hasRadius
          borderColor="neutral200"
          borderStyle="solid"
          borderWidth="1px"
          padding={2}
          width="100%"
        >
          <Flex gap={2}>{children}</Flex>
        </StyledRoot>
        {error && (
          <Typography variant="pi" textColor="danger500">
            {error}
          </Typography>
        )}
      </Flex>
    </AttachmentContext.Provider>
  );
};

/* -------------------------------------------------------------------------------------------------
 * Attachment Preview
 * -----------------------------------------------------------------------------------------------*/

interface AttachmentPreviewProps {
  children: ReactNode;
}

const Preview = ({ children }: AttachmentPreviewProps) => {
  const { error } = useAttachmentContext();

  return (
    <Flex alignItems="center" justifyContent="center">
      {error ? <WarningCircle fill="danger500" /> : children}
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

export { useAttachmentContext };
