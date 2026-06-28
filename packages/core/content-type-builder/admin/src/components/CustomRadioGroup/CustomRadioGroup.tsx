import type { ChangeEventHandler } from 'react';

import { Box, Flex, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { Wrapper } from './Styles';

import type { IntlLabel } from '../../types';

interface Radio {
  title: IntlLabel;
  description: IntlLabel;
  value: string | boolean;
}

interface CustomRadioGroupProps {
  intlLabel: IntlLabel;
  name: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
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
          const radioValue = radio.value.toString();

          return (
            <label htmlFor={radioValue} key={radioValue} className="container">
              <input
                id={radioValue}
                name={name}
                className="option-input"
                checked={radio.value === value}
                value={radioValue}
                key={radioValue}
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
