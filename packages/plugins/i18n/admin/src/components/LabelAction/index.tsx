import * as React from 'react';

import { Tooltip } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import styled from 'styled-components';

const Button = styled.button`
  border: none;
  padding: 0;
  background: transparent;
  svg {
    width: 12px;
    height: 12px;
    fill: ${({ theme }) => theme.colors.neutral500};
    path {
      fill: ${({ theme }) => theme.colors.neutral500};
    }
  }
`;

type LabelActionProps = {
  title: {
    id: string;
    defaultMessage: string;
  };
  icon: React.ReactNode;
};

const LabelAction = ({ title, icon }: LabelActionProps) => {
  const { formatMessage } = useIntl();

  return (
    <Tooltip description={formatMessage(title)}>
      <Button aria-label={formatMessage(title)} type="button">
        {icon}
      </Button>
    </Tooltip>
  );
};

export default LabelAction;
