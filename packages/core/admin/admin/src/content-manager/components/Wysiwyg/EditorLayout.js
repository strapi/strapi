import React from 'react';
import { useIntl } from 'react-intl';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { BaseButton, Box, Flex, FocusTrap, Portal, Typography } from '@strapi/design-system';
import { Collapse } from '@strapi/icons';
import { pxToRem, useLockScroll } from '@strapi/helper-plugin';

import PreviewWysiwyg from '../PreviewWysiwyg';

const setOpacity = (hex, alpha) =>
  `${hex}${Math.floor(alpha * 255)
    .toString(16)
    .padStart(2, 0)}`;

const ExpandWrapper = styled(Flex)`
  background: ${({ theme }) => setOpacity(theme.colors.neutral800, 0.2)};
`;

const BoxWithBorder = styled(Box)`
  border-right: 1px solid ${({ theme }) => theme.colors.neutral200};
`;

export const ExpandButton = styled(BaseButton)`
  background-color: transparent;
  border: none;
  align-items: center;

  svg {
    margin-left: ${({ theme }) => `${theme.spaces[2]}`};

    path {
      fill: ${({ theme }) => theme.colors.neutral700};
      width: ${12 / 16}rem;
      height: ${12 / 16}rem;
    }
  }
`;

export const EditorLayout = ({ children, isExpandMode, error, previewContent, onCollapse }) => {
  const { formatMessage } = useIntl();

  useLockScroll(isExpandMode);

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
              width="70%"
              height="70%"
              onClick={(e) => e.stopPropagation()}
            >
              <Flex height="100%" alignItems="flex-start">
                <BoxWithBorder flex="1" height="100%">
                  {children}
                </BoxWithBorder>
                <Flex alignItems="start" direction="column" flex={1} height="100%" width="100%">
                  <Flex
                    height={pxToRem(48)}
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

EditorLayout.defaultProps = {
  error: undefined,
  previewContent: '',
};

EditorLayout.propTypes = {
  children: PropTypes.node.isRequired,
  error: PropTypes.string,
  isExpandMode: PropTypes.bool.isRequired,
  previewContent: PropTypes.string,
  onCollapse: PropTypes.func.isRequired,
};
