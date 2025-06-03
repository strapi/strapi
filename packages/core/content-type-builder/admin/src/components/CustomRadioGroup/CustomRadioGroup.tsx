import { Box, Flex, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { Wrapper } from './Styles';

import type { IntlLabel } from '../../types';

interface Radio {
  title: IntlLabel;
  description: IntlLabel;
  value: any;
}

interface CustomRadioGroupProps {
  intlLabel: IntlLabel;
  name: string;
  onChange: (value: any) => void;
  radios?: Radio[];
  value?: string | boolean;
}

export const CustomRadioGroup = ({
  intlLabel,
  name,
  onChange,
  radios = [],
  value,
}: CustomRadioGroupProps) => {
  const { formatMessage } = useIntl();

  return (
    <Flex direction="column" alignItems="stretch" gap={2}>
      <Typography variant="pi" fontWeight="bold" textColor="neutral800" htmlFor={name} tag="label">
        {formatMessage(intlLabel)}
      </Typography>
      <Wrapper gap={4} alignItems="stretch">
        {radios.map((radio) => {
          return (
            <label htmlFor={radio.value.toString()} key={radio.value} className="container">
              <input
                id={radio.value.toString()}
                name={name}
                className="option-input"
                checked={radio.value === value}
                value={radio.value}
                key={radio.value}
                onChange={onChange}
                type="radio"
              />
              <Box className="option" padding={4}>
                <Flex>
                  <Box paddingRight={4}>
                    <span className="checkmark" />
                  </Box>
                  <Flex direction="column" alignItems="stretch" gap={2}>
                    <Typography fontWeight="bold">{formatMessage(radio.title)}</Typography>
                    <Typography variant="pi" textColor="neutral600">
                      {formatMessage(radio.description)}
                    </Typography>
                  </Flex>
                </Flex>
              </Box>
            </label>
          );
        })}
      </Wrapper>
    </Flex>
  );
};
