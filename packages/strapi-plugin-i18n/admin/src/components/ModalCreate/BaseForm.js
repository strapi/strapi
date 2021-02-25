import React from 'react';
import PropTypes from 'prop-types';
import { Label } from '@buffetjs/core';
import { Inputs } from '@buffetjs/custom';
import Select from 'react-select';
import { Col, Row } from 'reactstrap';
import { useIntl } from 'react-intl';
import { BaselineAlignment } from 'strapi-helper-plugin';
import { useFormikContext } from 'formik';
import { getTrad } from '../../utils';

const BaseForm = ({ options, defaultOption }) => {
  const { formatMessage } = useIntl();
  const { values, handleChange, setFieldValue } = useFormikContext();

  return (
    <Row>
      <Col>
        <span id="locale-code">
          <Label htmlFor="">
            {formatMessage({
              id: getTrad('Settings.locales.modal.locales.label'),
            })}
          </Label>
        </span>

        <BaselineAlignment top size="5px" />

        <Select
          aria-labelledby="locale-code"
          options={options}
          defaultValue={defaultOption}
          onChange={selection => {
            setFieldValue('displayName', selection.value);
            setFieldValue('code', selection.label);
          }}
          styles={{
            control: base => ({ ...base, height: '34px', minHeight: 'unset' }),
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
    PropTypes.exact({ value: PropTypes.string.isRequired, label: PropTypes.string.isRequired })
  ).isRequired,
  defaultOption: PropTypes.exact({
    value: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
  }),
};

export default BaseForm;
