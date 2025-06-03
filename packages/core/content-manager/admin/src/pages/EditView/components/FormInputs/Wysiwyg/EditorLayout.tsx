import * as React from 'react';

import { Button, Box, BoxComponent, Flex, Typography, Modal } from '@strapi/design-system';
import { Collapse } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { PreviewWysiwyg } from './PreviewWysiwyg';

interface EditorLayoutProps {
  children: React.ReactNode;
  isExpandMode: boolean;
  error?: string;
  previewContent?: string;
  onCollapse: () => void;
}

const EditorLayout = ({
  children,
  isExpandMode,
  error,
  previewContent = '',
  onCollapse,
}: EditorLayoutProps) => {
  const { formatMessage } = useIntl();

  if (isExpandMode) {
    return (
      <Modal.Root open={isExpandMode} onOpenChange={onCollapse}>
        <Modal.Content style={{ maxWidth: 'unset', width: 'unset' }}>
          <Flex height="90vh" width="90vw" alignItems="flex-start">
            <BoxWithBorder flex="1" height="100%">
              {children}
            </BoxWithBorder>
            <Flex alignItems="start" direction="column" flex={1} height="100%" width="100%">
              <Flex
                height="4.8rem"
                background="neutral100"
                justifyContent="flex-end"
                shrink={0}
                width="100%"
              >
                <ExpandButton onClick={onCollapse} variant="tertiary" size="M">
                  <Typography>
                    {formatMessage({
                      id: 'components.Wysiwyg.collapse',
                      defaultMessage: 'Collapse',
                    })}
                  </Typography>
                  <Collapse />
                </ExpandButton>
              </Flex>
              <Box position="relative" height="100%" width="100%">
                <PreviewWysiwyg data={previewContent} />
              </Box>
            </Flex>
          </Flex>
        </Modal.Content>
      </Modal.Root>
    );
  }

  return (
    <Flex
      borderColor={error ? 'danger600' : 'neutral200'}
      borderStyle="solid"
      borderWidth="1px"
      hasRadius
      direction="column"
      alignItems="stretch"
    >
      {children}
    </Flex>
  );
};

const BoxWithBorder = styled<BoxComponent>(Box)`
  border-right: 1px solid ${({ theme }) => theme.colors.neutral200};
`;

const ExpandButton = styled(Button)`
  background-color: transparent;
  border: none;
  align-items: center;

  & > span {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    font-weight: ${({ theme }) => theme.fontWeights.regular};
  }

  svg {
    margin-left: ${({ theme }) => `${theme.spaces[2]}`};

    path {
      fill: ${({ theme }) => theme.colors.neutral700};
      width: 1.2rem;
      height: 1.2rem;
    }
  }
`;

export { EditorLayout, ExpandButton };
export type { EditorLayoutProps };
