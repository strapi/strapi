import { Flex, FocusTrap, IconButton, Menu } from '@strapi/design-system';
import { Check, Cross } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { styled, useTheme } from 'styled-components';

import { getTrad } from '../../../utils';

import { CroppingActionRow } from './PreviewComponents';

interface CroppingActionsProps {
  onCancel: () => void;
  onValidate: () => void;
  onDuplicate?: () => void;
}

export const CroppingActions = ({ onCancel, onValidate, onDuplicate }: CroppingActionsProps) => {
  const { formatMessage } = useIntl();
  const theme = useTheme();

  return (
    <FocusTrap onEscape={onCancel}>
      <CroppingActionRow justifyContent="flex-end" paddingLeft={3} paddingRight={3}>
        <Flex gap={1}>
          <IconButton
            label={formatMessage({
              id: getTrad('control-card.stop-crop'),
              defaultMessage: 'Stop cropping',
            })}
            onClick={onCancel}
          >
            <Cross />
          </IconButton>

          <Menu.Root>
            <Trigger
              aria-label={formatMessage({
                id: getTrad('control-card.crop'),
                defaultMessage: 'Crop',
              })}
              variant="tertiary"
              paddingLeft={2}
              paddingRight={2}
              endIcon={null}
            >
              <Check
                aria-hidden
                focusable={false}
                style={{ position: 'relative', top: 2 }}
                fill="#C0C0D0"
              />
            </Trigger>
            <Menu.Content zIndex={theme.zIndices.dialog}>
              <Menu.Item onSelect={onValidate}>
                {formatMessage({
                  id: getTrad('checkControl.crop-original'),
                  defaultMessage: 'Crop the original asset',
                })}
              </Menu.Item>

              {onDuplicate && (
                <Menu.Item onSelect={onDuplicate}>
                  {formatMessage({
                    id: getTrad('checkControl.crop-duplicate'),
                    defaultMessage: 'Duplicate & crop the asset',
                  })}
                </Menu.Item>
              )}
            </Menu.Content>
          </Menu.Root>
        </Flex>
      </CroppingActionRow>
    </FocusTrap>
  );
};

const Trigger = styled(Menu.Trigger)`
  svg {
    > g,
    path {
      fill: ${({ theme }) => theme.colors.neutral500};
    }
  }

  &:hover {
    svg {
      > g,
      path {
        fill: ${({ theme }) => theme.colors.neutral600};
      }
    }
  }

  &:active {
    svg {
      > g,
      path {
        fill: ${({ theme }) => theme.colors.neutral400};
      }
    }
  }
`;
