import * as React from 'react';

import { Box, Flex, FocusTrap, Portal, IconButton, InputWrapper } from '@strapi/design-system';
import { useLockScroll, pxToRem } from '@strapi/helper-plugin';
import { Collapse } from '@strapi/icons';
import { useIntl } from 'react-intl';
import styled from 'styled-components';

import { getTranslation } from '../../utils/translations';

import { useBlocksEditorContext } from './BlocksEditor';

const CollapseIconButton = styled(IconButton)`
  position: absolute;
  bottom: ${pxToRem(12)};
  right: ${pxToRem(12)};
`;

const ExpandWrapper = styled(Flex)`
  // Background with 20% opacity
  background: ${({ theme }) => `${theme.colors.neutral800}1F`};
`;

interface EditorLayoutProps {
  children: React.ReactNode;
  error?: string;
  onCollapse: () => void;
  disabled: boolean;
  ariaDescriptionId: string;
}

const EditorLayout = ({
  children,
  error,
  disabled,
  onCollapse,
  ariaDescriptionId,
}: EditorLayoutProps) => {
  const { formatMessage } = useIntl();
  const { isExpandedMode } = useBlocksEditorContext('editorLayout');

  useLockScroll({ lockScroll: isExpandedMode });

  if (isExpandedMode) {
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
              aria-describedby={ariaDescriptionId}
              position="relative"
            >
              <Flex height="100%" alignItems="flex-start" direction="column">
                {children}
                <CollapseIconButton
                  aria-label={formatMessage({
                    id: getTranslation('components.Blocks.collapse'),
                    defaultMessage: 'Collapse',
                  })}
                  onClick={onCollapse}
                >
                  <Collapse />
                </CollapseIconButton>
              </Flex>
            </Box>
          </ExpandWrapper>
        </FocusTrap>
      </Portal>
    );
  }

  return (
    <InputWrapper
      direction="column"
      alignItems="flex-start"
      height="512px"
      disabled={disabled}
      hasError={Boolean(error)}
      style={{ overflow: 'hidden' }}
      aria-describedby={ariaDescriptionId}
      position="relative"
    >
      {children}
    </InputWrapper>
  );
};

export { EditorLayout };
