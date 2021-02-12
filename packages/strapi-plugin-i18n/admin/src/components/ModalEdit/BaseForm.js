import React from 'react';
import PropTypes from 'prop-types';
import { Label } from '@buffetjs/core';
import { Inputs } from '@buffetjs/custom';
import Select from 'react-select';
import { Col, Row } from 'reactstrap';
import { useIntl } from 'react-intl';
import { useFormikContext } from 'formik';
import { getTrad } from '../../utils';

const BaseForm = ({ options, defaultOption }) => {
  const { formatMessage } = useIntl();
  const { values, handleChange } = useFormikContext();

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

        <Select
          aria-labelledby="locale-code"
          options={options}
          defaultValue={defaultOption}
          isDisabled
        />
      </Col>
      <Col>
        <Inputs
          label={formatMessage({
            id: getTrad('Settings.locales.modal.edit.locales.displayName'),
          })}
          name="displayName"
          description={formatMessage({
            id: getTrad('Settings.locales.modal.edit.locales.displayName.description'),
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
