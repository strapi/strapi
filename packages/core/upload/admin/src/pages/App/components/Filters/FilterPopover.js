import React from 'react';
import { Formik } from 'formik';
import PropTypes from 'prop-types';
import { Button } from '@strapi/parts/Button';
import { Popover } from '@strapi/parts/Popover';
import { Stack } from '@strapi/parts/Stack';
import { FocusTrap } from '@strapi/parts/FocusTrap';
import { Select, Option } from '@strapi/parts/Select';
import { DatePicker } from '@strapi/parts/DatePicker';
import AddIcon from '@strapi/icons/AddIcon';
import { useIntl } from 'react-intl';
import { getFilterList, Form, useQueryParams } from '@strapi/helper-plugin';
import getTrad from '../../../../utils/getTrad';

export const FilterPopover = ({ onClose, sourceRef }) => {
  const { formatMessage } = useIntl();
  const [{ query }, setQuery] = useQueryParams();

  const handleSubmit = values => {};

  return (
    <Popover source={sourceRef} padding={3} spacing={4}>
      <FocusTrap onEscape={onClose}>
        <Formik
          enableReinitialize
          initialValues={{
            field: '',
            comparator: '',
            value: undefined,
          }}
          onSubmit={handleSubmit}
          validateOnChange={false}
        >
          {({ values, setFieldValue, setTouched }) => (
            <Form noValidate>
              <Stack size={1} minWidth="184px">
                <Select
                  aria-label={formatMessage({
                    id: 'app.utils.select-field',
                    defaultMessage: 'Select field',
                  })}
                  placeholder="e.g: createdAt"
                  size="M"
                  onChange={nextValue => {
                    setTouched('field', true);
                    setFieldValue('field', nextValue);

                    setFieldValue('value', '');
                  }}
                  value={values.field}
                >
                  <Option value="createdAt">createdAt</Option>
                  <Option value="updatedAt">updatedAt</Option>
                  <Option value="mime">type</Option>
                </Select>

                <Select
                  aria-label={formatMessage({
                    id: 'app.utils.select-filter',
                    defaultMessage: 'Select filter',
                  })}
                  size="M"
                  placeholder="e.g: is"
                  value={values.comparator}
                  onChange={nextValue => {
                    setTouched('comparator', true);
                    setFieldValue('comparator', nextValue);
                  }}
                >
                  {getFilterList({ fieldSchema: { type: 'string' } }).map(option => {
                    return (
                      <Option key={option.value} value={option.value}>
                        {formatMessage(option.intlLabel)}
                      </Option>
                    );
                  })}
                </Select>

                {values.field === 'mime' ? (
                  <Select
                    aria-label={formatMessage({
                      id: 'filter.mime',
                      defaultMessage: 'Select a type',
                    })}
                    placeholder={formatMessage({
                      id: 'filter.mime.placeholder',
                      defaultMessage: 'e.g: video',
                    })}
                    size="M"
                    value={values.value}
                    onChange={nextValue => {
                      setTouched('value', true);
                      setFieldValue('value', nextValue);
                    }}
                  >
                    {['image', 'video', 'file'].map(assetType => (
                      <Option key={assetType} value={assetType}>
                        {assetType}
                      </Option>
                    ))}
                  </Select>
                ) : (
                  <DatePicker
                    onChange={date => {
                      setTouched('value', true);
                      setFieldValue('value', date);
                    }}
                    selectedDate={values.value}
                    aria-label={formatMessage({
                      id: getTrad('filter.date'),
                      defaultMessage: 'Select a date',
                    })}
                    name="value"
                    placeholder={formatMessage({
                      id: getTrad('filter.date.placeholder'),
                      defaultMessage: 'e.g: 24/12/2019',
                    })}
                    onClear={() => setFieldValue('value', '')}
                  />
                )}

                <Button size="L" variant="secondary" startIcon={<AddIcon />} type="submit">
                  {formatMessage({ id: 'app.utils.add-filter', defaultMessage: 'Add filter' })}
                </Button>
              </Stack>
            </Form>
          )}
        </Formik>
      </FocusTrap>
    </Popover>
  );
};

FilterPopover.propTypes = {
  sourceRef: PropTypes.shape({ current: PropTypes.instanceOf(HTMLElement) }).isRequired,
  onClose: PropTypes.func.isRequired,
};
