import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Typography, Box, Flex } from '@strapi/design-system';
import { Wrapper } from './components';

const CustomRadioGroup = ({ intlLabel, name, onChange, radios, value }) => {
  const { formatMessage } = useIntl();

  return (
    <Flex direction="column" alignItems="stretch" gap={2}>
      <Typography variant="pi" fontWeight="bold" textColor="neutral800" htmlFor={name} as="label">
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

CustomRadioGroup.defaultProps = {
  radios: [],
};

CustomRadioGroup.propTypes = {
  intlLabel: PropTypes.shape({
    id: PropTypes.string.isRequired,
    defaultMessage: PropTypes.string.isRequired,
    values: PropTypes.object,
  }).isRequired,
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  radios: PropTypes.arrayOf(
    PropTypes.shape({
      title: PropTypes.shape({
        id: PropTypes.string.isRequired,
        defaultMessage: PropTypes.string.isRequired,
      }),
      description: PropTypes.shape({
        id: PropTypes.string.isRequired,
        defaultMessage: PropTypes.string.isRequired,
      }),
      value: PropTypes.any.isRequired,
    })
  ),
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]).isRequired,
};

export default CustomRadioGroup;
