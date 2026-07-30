import { createContext, useContext } from 'react';

import { Box, Flex, Typography } from '@strapi/design-system';
import { styled } from 'styled-components';

/* -------------------------------------------------------------------------------------------------
 * Input Context
 * -----------------------------------------------------------------------------------------------*/

export interface InputContextValue {
  isLoading?: boolean;
}

export const InputContext = createContext<InputContextValue>({});

export const useInput = () => useContext(InputContext);

/* -------------------------------------------------------------------------------------------------
 * Input Root
 * -----------------------------------------------------------------------------------------------*/

export interface InputRootProps extends React.ComponentPropsWithoutRef<typeof Flex> {
  children: React.ReactNode;
  isLoading?: boolean;
}

export const Root = ({ children, isLoading = false, ...props }: InputRootProps) => {
  return (
    <InputContext.Provider
      value={{
        isLoading,
      }}
    >
      <Flex
        direction="column"
        alignItems={'flex-start'}
        width="100%"
        position="relative"
        {...props}
      >
        {children}
      </Flex>
    </InputContext.Provider>
  );
};

/* -------------------------------------------------------------------------------------------------
 * Input Header
 * -----------------------------------------------------------------------------------------------*/

interface HeaderProps extends React.ComponentPropsWithoutRef<typeof Box> {
  children: React.ReactNode;
  isThinking?: boolean;
  thinkingMessage?: string;
}

const Header = ({ children, ...props }: HeaderProps) => {
  return (
    <Box
      position="absolute"
      bottom={'102%'}
      left={0}
      right={0}
      background="neutral0"
      width="100%"
      {...props}
    >
      {children}
    </Box>
  );
};

const HeaderItem = styled(Box)`
  padding: ${({ theme }) => theme.spaces[3]} 0};
`;

/* -------------------------------------------------------------------------------------------------
 * Input Attachments
 * -----------------------------------------------------------------------------------------------*/
interface InputAttachmentsProps extends React.ComponentPropsWithoutRef<typeof Flex> {
  children: React.ReactNode;
}

const Attachments = ({ children, gap = 2, ...props }: InputAttachmentsProps) => {
  return (
    <Flex gap={gap} wrap="wrap" paddingBottom={2} maxHeight="150px" overflow="auto" {...props}>
      {children}
    </Flex>
  );
};

/* -------------------------------------------------------------------------------------------------
 * Input Content
 * -----------------------------------------------------------------------------------------------*/

const InputContainer = styled(Box)`
  outline: none;
  box-shadow: none;
  transition-property: border-color, box-shadow, fill;
  transition-duration: 0.2s;

  &:focus-within {
    border: 1px solid
      ${({ theme, $hasError }) => ($hasError ? theme.colors.danger600 : theme.colors.primary600)};
    box-shadow: ${({ theme, $hasError }) =>
        $hasError ? theme.colors.danger600 : theme.colors.primary600}
      0px 0px 0px 2px;
  }
`;

interface ContentProps extends React.ComponentPropsWithoutRef<typeof Box> {
  children: React.ReactNode;
  disclaimer?: string;
  error?: boolean;
}

const Content = ({ children, disclaimer, error = false, ...props }: ContentProps) => {
  return (
    <InputContainer
      background="neutral0"
      hasRadius
      borderColor={error ? 'danger600' : 'neutral200'}
      borderWidth="1px"
      borderStyle="solid"
      width="100%"
      $hasError={error}
      {...props}
    >
      <Box padding={3}>{children}</Box>
      {disclaimer && (
        <Box
          background="neutral100"
          padding={[2, 3]}
          borderColor="neutral200"
          borderWidth="1px 0 0 0"
          borderStyle="solid"
          borderRadius={'0 0 4px 4px'}
        >
          <Typography variant="pi" textColor="neutral600">
            {disclaimer}
          </Typography>
        </Box>
      )}
    </InputContainer>
  );
};

/* -------------------------------------------------------------------------------------------------
 * Input Actions
 * -----------------------------------------------------------------------------------------------*/

const Actions = ({ children }: { children: React.ReactNode }) => {
  return (
    <Flex justifyContent="flex-end" alignItems="center" gap={2}>
      {children}
    </Flex>
  );
};

/* -------------------------------------------------------------------------------------------------
 * Input Compound
 * -----------------------------------------------------------------------------------------------*/

export const Input = {
  Root,
  Header,
  HeaderItem,
  Attachments,
  Content,
  Actions,
  useInput,
};
