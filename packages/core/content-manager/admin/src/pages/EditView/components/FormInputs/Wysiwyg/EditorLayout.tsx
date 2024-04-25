import * as React from 'react';

import { BaseButton, Box, Flex, FocusTrap, Portal, Typography } from '@strapi/design-system';
import { Collapse } from '@strapi/icons';
import { useIntl } from 'react-intl';
import styled from 'styled-components';

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

  React.useEffect(() => {
    if (isExpandMode) {
      document.body.classList.add('lock-body-scroll');
    }

    return () => {
      document.body.classList.remove('lock-body-scroll');
    };
  }, [isExpandMode]);

  if (isExpandMode) {
    return (
      <Portal role="dialog" aria-modal={false}>
        <FocusTrap onEscape={onCollapse}>
          <ExpandWrapper
            position="fixed"
            top={0}
            left={0}
            right={0}
            bottom={0}
            zIndex={4}
            justifyContent="center"
            onClick={onCollapse}
          >
            <Box
              background="neutral0"
              hasRadius
              shadow="popupShadow"
              overflow="hidden"
              width="90%"
              height="90%"
              onClick={(e) => e.stopPropagation()}
            >
              <Flex height="100%" alignItems="flex-start">
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
                    <ExpandButton onClick={onCollapse}>
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
            </Box>
          </ExpandWrapper>
        </FocusTrap>
      </Portal>
    );
  }

  return (
    <Box
      borderColor={error ? 'danger600' : 'neutral200'}
      borderStyle="solid"
      borderWidth="1px"
      hasRadius
    >
      {children}
    </Box>
  );
};

const ExpandWrapper = styled(Flex)`
  background: ${({ theme }) =>
    `${theme.colors.neutral800}${Math.floor(0.2 * 255)
      .toString(16)
      .padStart(2, '0')}`};
`;

const BoxWithBorder = styled(Box)`
  border-right: 1px solid ${({ theme }) => theme.colors.neutral200};
`;

const ExpandButton = styled(BaseButton)`
  background-color: transparent;
  border: none;
  align-items: center;

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
