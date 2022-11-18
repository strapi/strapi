import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { Flex, Box, FocusTrap, Portal, BaseButton, Typography } from '@strapi/design-system';
import { pxToRem } from '@strapi/helper-plugin';
import Collapse from '@strapi/icons/Collapse';
import { useIntl } from 'react-intl';
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
  useEffect(() => {
    const body = document.body;

    if (isExpandMode) {
      body.classList.add('lock-body-scroll');
    }

    return () => {
      if (isExpandMode) {
        body.classList.remove('lock-body-scroll');
      }
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
              id="wysiwyg-expand"
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
                <Box flex="1" height="100%">
                  <Flex height={pxToRem(48)} background="neutral100" justifyContent="flex-end">
                    <ExpandButton id="collapse" onClick={onCollapse}>
                      <Typography>
                        {formatMessage({
                          id: 'components.Wysiwyg.collapse',
                          defaultMessage: 'Collapse',
                        })}
                      </Typography>
                      <Collapse />
                    </ExpandButton>
                  </Flex>

                  <Box position="relative" height="100%">
                    <PreviewWysiwyg data={previewContent} />
                  </Box>
                </Box>
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
