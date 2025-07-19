import * as React from 'react';

import { Flex, IconButton, FlexComponent, Modal } from '@strapi/design-system';
import { Collapse } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { css, styled } from 'styled-components';

import { getTranslation } from '../../../../../utils/translations';

import { useBlocksEditorContext } from './BlocksEditor';

interface EditorLayoutProps {
  children: React.ReactNode;
  error?: string;
  onToggleExpand: () => void;
  disabled: boolean;
  ariaDescriptionId: string;
}

const EditorLayout = ({
  children,
  error,
  disabled,
  onToggleExpand,
  ariaDescriptionId,
}: EditorLayoutProps) => {
  const { formatMessage } = useIntl();
  const { isExpandedMode } = useBlocksEditorContext('editorLayout');

  return (
    <>
      {isExpandedMode && (
        <Modal.Root open={isExpandedMode} onOpenChange={onToggleExpand}>
          <Modal.Content style={{ maxWidth: 'unset', width: 'unset' }}>
            <Flex height="90vh" width="90vw" alignItems="flex-start" direction="column">
              {children}
              <IconButton
                position="absolute"
                bottom="1.2rem"
                right="1.2rem"
                shadow="filterShadow"
                label={formatMessage({
                  id: getTranslation('components.Blocks.collapse'),
                  defaultMessage: 'Collapse',
                })}
                onClick={onToggleExpand}
              >
                <Collapse />
              </IconButton>
            </Flex>
          </Modal.Content>
        </Modal.Root>
      )}
      <InputWrapper
        direction="column"
        alignItems="flex-start"
        height="512px"
        $disabled={disabled}
        $hasError={Boolean(error)}
        style={{ overflow: 'hidden' }}
        aria-describedby={ariaDescriptionId}
        position="relative"
      >
        {!isExpandedMode && children}
      </InputWrapper>
    </>
  );
};

const InputWrapper = styled<FlexComponent>(Flex)<{ $disabled?: boolean; $hasError?: boolean }>`
  border: 1px solid
    ${({ theme, $hasError }) => ($hasError ? theme.colors.danger600 : theme.colors.neutral200)};
  border-radius: ${({ theme }) => theme.borderRadius};
  background: ${({ theme }) => theme.colors.neutral0};

  ${({ theme, $hasError = false }) => css`
    outline: none;
    box-shadow: 0;
    transition-property: border-color, box-shadow, fill;
    transition-duration: 0.2s;

    &:focus-within {
      border: 1px solid ${$hasError ? theme.colors.danger600 : theme.colors.primary600};
      box-shadow: ${$hasError ? theme.colors.danger600 : theme.colors.primary600} 0px 0px 0px 2px;
    }
  `}

  ${({ theme, $disabled }) =>
    $disabled
      ? css`
          color: ${theme.colors.neutral600};
          background: ${theme.colors.neutral150};
        `
      : undefined}
`;

export { EditorLayout };
