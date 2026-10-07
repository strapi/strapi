import { Flex, FocusTrap, IconButton } from '@strapi/design-system';
import { Check, Cross, ArrowsCounterClockwise } from '@strapi/icons';
import { useIntl } from 'react-intl';

import { getTrad } from '../../../utils';

import { FocalPointActionRow } from './PreviewComponents';

interface FocalPointActionsProps {
  onCancel: () => void;
  onValidate: () => void;
  onReset: () => void;
}

export const FocalPointActions = ({ onCancel, onValidate, onReset }: FocalPointActionsProps) => {
  const { formatMessage } = useIntl();

  return (
    <FocusTrap onEscape={onCancel}>
      <FocalPointActionRow justifyContent="flex-end" paddingLeft={3} paddingRight={3}>
        <Flex gap={1}>
          <IconButton
            label={formatMessage({
              id: getTrad('control-card.stop-focal-point'),
              defaultMessage: 'Cancel focal point selection',
            })}
            onClick={onCancel}
          >
            <Cross />
          </IconButton>

          <IconButton
            label={formatMessage({
              id: getTrad('control-card.reset-focal-point'),
              defaultMessage: 'Reset to center',
            })}
            onClick={onReset}
          >
            <ArrowsCounterClockwise />
          </IconButton>

          <IconButton
            label={formatMessage({
              id: getTrad('control-card.save-focal-point'),
              defaultMessage: 'Save focal point',
            })}
            onClick={onValidate}
          >
            <Check />
          </IconButton>
        </Flex>
      </FocalPointActionRow>
    </FocusTrap>
  );
};
