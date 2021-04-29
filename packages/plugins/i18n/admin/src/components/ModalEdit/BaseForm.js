import React from 'react';
import PropTypes from 'prop-types';
import { Label } from '@buffetjs/core';
import { Inputs } from '@buffetjs/custom';
import Select from 'react-select';
import { Col, Row } from 'reactstrap';
import { useIntl } from 'react-intl';
import { useTheme } from 'styled-components';
import { BaselineAlignment, selectStyles, DropdownIndicator } from 'strapi-helper-plugin';
import { useFormikContext } from 'formik';
import { getTrad } from '../../utils';

const BaseForm = ({ options, defaultOption }) => {
  const { formatMessage } = useIntl();
  const { values, handleChange } = useFormikContext();
  const theme = useTheme();
  const styles = selectStyles(theme);

  return (
    <Row>
      <Col>
        <span id="locale-code">
          <Label htmlFor="">
            {formatMessage({
              id: getTrad('Settings.locales.modal.edit.locales.label'),
            })}
          </Label>
        </span>

        <BaselineAlignment top size="5px" />

        <Select
          aria-labelledby="locale-code"
          options={options}
          defaultValue={defaultOption}
          isDisabled
          components={{ DropdownIndicator }}
          styles={{
            ...styles,
            control: (base, state) => ({ ...base, ...styles.control(base, state), height: '34px' }),
            indicatorsContainer: (base, state) => ({
              ...base,
              ...styles.indicatorsContainer(base, state),
              height: '32px',
            }),
          }}
        />
      </Col>
      <Col>
        <BaselineAlignment top size="2px" />

        <Inputs
          label={formatMessage({
            id: getTrad('Settings.locales.modal.locales.displayName'),
          })}
          name="displayName"
          description={formatMessage({
            id: getTrad('Settings.locales.modal.locales.displayName.description'),
          })}
          type="text"
          value={values.displayName}
          onChange={handleChange}
          validations={{
            max: 50,
          }}
          translatedErrors={{
            max: formatMessage({
              id: getTrad('Settings.locales.modal.locales.displayName.error'),
            }),
          }}
        />
      </Col>
    </Row>
  );
};

BaseForm.defaultProps = {
  defaultOption: undefined,
};

BaseForm.propTypes = {
  options: PropTypes.arrayOf(
    PropTypes.exact({ value: PropTypes.number.isRequired, label: PropTypes.string.isRequired })
  ).isRequired,
  defaultOption: PropTypes.exact({
    value: PropTypes.number.isRequired,
    label: PropTypes.string.isRequired,
  }),
};

export default BaseForm;
