import React, { useEffect, useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { useCMEditViewDataManager } from '@strapi/helper-plugin';
import { useIntl } from 'react-intl';
import get from 'lodash/get';
import { TextInput } from '@strapi/design-system/TextInput';
import { Typography } from '@strapi/design-system/Typography';
import Refresh from '@strapi/icons/Refresh';
import CheckCircle from '@strapi/icons/CheckCircle';
import ExclamationMarkCircle from '@strapi/icons/ExclamationMarkCircle';
import Loader from '@strapi/icons/Loader';
import { axiosInstance } from '../../../core/utils';
import { getRequestUrl } from '../../utils';
import useDebounce from './useDebounce';
import UID_REGEX from './regex';
import {
  EndActionWrapper,
  FieldActionWrapper,
  TextValidation,
  LoadingWrapper,
} from './endActionStyle';

const InputUID = ({
  attribute,
  contentTypeUID,
  description,
  disabled,
  error,
  intlLabel,
  labelAction,
  name,
  onChange,
  value,
  placeholder,
  required,
}) => {
  const { modifiedData, initialData, layout } = useCMEditViewDataManager();
  const [isLoading, setIsLoading] = useState(false);
  const [availability, setAvailability] = useState(null);
  const debouncedValue = useDebounce(value, 300);
  const generateUid = useRef();
  const initialValue = initialData[name];
  const { formatMessage } = useIntl();
  const createdAtName = get(layout, ['options', 'timestamps', 0]);
  const isCreation = !initialData[createdAtName];
  const debouncedTargetFieldValue = useDebounce(modifiedData[attribute.targetField], 300);
  const [isCustomized, setIsCustomized] = useState(false);
  const [regenerateLabel, setRegenerateLabel] = useState(null);

  const label = intlLabel.id
    ? formatMessage(
        { id: intlLabel.id, defaultMessage: intlLabel.defaultMessage },
        { ...intlLabel.values }
      )
    : name;

  const hint = description
    ? formatMessage(
        { id: description.id, defaultMessage: description.defaultMessage },
        { ...description.values }
      )
    : '';

  const formattedPlaceholder = placeholder
    ? formatMessage(
        { id: placeholder.id, defaultMessage: placeholder.defaultMessage },
        { ...placeholder.values }
      )
    : '';

  generateUid.current = async (shouldSetInitialValue = false) => {
    setIsLoading(true);
    const requestURL = getRequestUrl('uid/generate');
    try {
      const {
        data: { data },
      } = await axiosInstance.post(requestURL, {
        contentTypeUID,
        field: name,
        data: modifiedData,
      });
      onChange({ target: { name, value: data, type: 'text' } }, shouldSetInitialValue);
      setIsLoading(false);
    } catch (err) {
      setIsLoading(false);
    }
  };

  const checkAvailability = async () => {
    setIsLoading(true);

    const requestURL = getRequestUrl('uid/check-availability');

    if (!value) {
      return;
    }

    try {
      const { data } = await axiosInstance.post(requestURL, {
        contentTypeUID,
        field: name,
        value: value ? value.trim() : '',
      });

      setAvailability(data);

      setIsLoading(false);
    } catch (err) {
      setIsLoading(false);
    }
  };

  // // FIXME: we need to find a better way to autofill the input when it is required.
  useEffect(() => {
    if (!value && attribute.required) {
      generateUid.current(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (
      debouncedValue &&
      debouncedValue.trim().match(UID_REGEX) &&
      debouncedValue !== initialValue
    ) {
      checkAvailability();
    }
    if (!debouncedValue) {
      setAvailability(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedValue, initialValue]);

  useEffect(() => {
    let timer;

    if (availability && availability.isAvailable) {
      timer = setTimeout(() => {
        setAvailability(null);
      }, 4000);
    }

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [availability]);

  useEffect(() => {
    if (
      !isCustomized &&
      isCreation &&
      debouncedTargetFieldValue &&
      modifiedData[attribute.targetField] &&
      !value
    ) {
      generateUid.current(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedTargetFieldValue, isCustomized, isCreation]);

  const handleGenerateMouseEnter = () => {
    setRegenerateLabel(
      formatMessage({
        id: 'content-manager.components.uid.regenerate',
        defaultMessage: 'Regenerate',
      })
    );
  };

  const handleGenerateMouseLeave = () => {
    setRegenerateLabel(null);
  };

  const handleChange = (e) => {
    if (e.target.value && isCreation) {
      setIsCustomized(true);
    }

    onChange(e);
  };

  return (
    <TextInput
      disabled={disabled}
      error={error}
      endAction={
        <EndActionWrapper>
          {availability && availability.isAvailable && !regenerateLabel && (
            <TextValidation alignItems="center" justifyContent="flex-end">
              <CheckCircle />
              <Typography textColor="success600" variant="pi">
                {formatMessage({
                  id: 'content-manager.components.uid.available',
                  defaultMessage: 'Available',
                })}
              </Typography>
            </TextValidation>
          )}
          {availability && !availability.isAvailable && !regenerateLabel && (
            <TextValidation notAvailable alignItems="center" justifyContent="flex-end">
              <ExclamationMarkCircle />
              <Typography textColor="danger600" variant="pi">
                {formatMessage({
                  id: 'content-manager.components.uid.unavailable',
                  defaultMessage: 'Unavailable',
                })}
              </Typography>
            </TextValidation>
          )}
          {regenerateLabel && (
            <TextValidation alignItems="center" justifyContent="flex-end">
              <Typography textColor="primary600" variant="pi">
                {regenerateLabel}
              </Typography>
            </TextValidation>
          )}
          <FieldActionWrapper
            onClick={() => generateUid.current()}
            label="regenerate"
            onMouseEnter={handleGenerateMouseEnter}
            onMouseLeave={handleGenerateMouseLeave}
          >
            {isLoading ? (
              <LoadingWrapper>
                <Loader />
              </LoadingWrapper>
            ) : (
              <Refresh />
            )}
          </FieldActionWrapper>
        </EndActionWrapper>
      }
      hint={hint}
      label={label}
      labelAction={labelAction}
      name={name}
      onChange={handleChange}
      placeholder={formattedPlaceholder}
      value={value || ''}
      required={required}
    />
  );
};

InputUID.propTypes = {
  attribute: PropTypes.shape({
    targetField: PropTypes.string,
    required: PropTypes.bool,
  }).isRequired,
  contentTypeUID: PropTypes.string.isRequired,
  description: PropTypes.shape({
    id: PropTypes.string.isRequired,
    defaultMessage: PropTypes.string.isRequired,
    values: PropTypes.object,
  }),
  disabled: PropTypes.bool,
  error: PropTypes.string,
  intlLabel: PropTypes.shape({
    id: PropTypes.string.isRequired,
    defaultMessage: PropTypes.string.isRequired,
    values: PropTypes.object,
  }).isRequired,
  labelAction: PropTypes.element,
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  value: PropTypes.string,
  placeholder: PropTypes.shape({
    id: PropTypes.string.isRequired,
    defaultMessage: PropTypes.string.isRequired,
    values: PropTypes.object,
  }),
  required: PropTypes.bool,
};

InputUID.defaultProps = {
  description: undefined,
  disabled: false,
  error: undefined,
  labelAction: undefined,
  placeholder: undefined,
  value: '',
  required: false,
};

export default InputUID;
