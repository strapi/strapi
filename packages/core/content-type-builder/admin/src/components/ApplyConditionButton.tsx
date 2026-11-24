import { Button, Tooltip } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { getTrad } from '../utils/getTrad';

interface ApplyConditionButtonProps {
  disabled?: boolean;
  tooltipMessage?: string;
  onClick?: () => void;
  marginTop?: number;
}

export const ApplyConditionButton = ({
  disabled,
  tooltipMessage,
  onClick,
  marginTop = 4,
}: ApplyConditionButtonProps) => {
  const { formatMessage } = useIntl();

  const button = (
    <Button
      marginTop={marginTop}
      fullWidth={true}
      variant="secondary"
      disabled={disabled}
      onClick={onClick}
      startIcon={<span aria-hidden>＋</span>}
    >
      {formatMessage({
        id: getTrad('form.attribute.condition.apply'),
        defaultMessage: 'Apply condition',
      })}
    </Button>
  );

  if (tooltipMessage) {
    return <Tooltip description={tooltipMessage}>{button}</Tooltip>;
  }

  return button;
};
