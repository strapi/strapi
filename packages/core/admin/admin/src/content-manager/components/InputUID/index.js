import React, { useEffect, useState, useRef } from 'react';
import PropTypes from 'prop-types';
import {
  useCMEditViewDataManager,
  useFetchClient,
  useNotification,
  useAPIErrorHandler,
} from '@strapi/helper-plugin';
import { useIntl } from 'react-intl';
import { Flex, TextInput, Typography } from '@strapi/design-system';
import { Refresh, CheckCircle, ExclamationMarkCircle, Loader } from '@strapi/icons';

import { getRequestUrl } from '../../utils';
import useDebounce from './useDebounce';
import UID_REGEX from './regex';
import { FieldActionWrapper, TextValidation, LoadingWrapper } from './endActionStyle';

const InputUID = ({
  attribute,
  contentTypeUID,
  hint,
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
  const toggleNotification = useNotification();
  const { formatAPIError } = useAPIErrorHandler();
  const initialValue = initialData[name];
  const { formatMessage } = useIntl();
  const createdAtName = layout?.options?.timestamps ?? 0;
  const isCreation = !initialData[createdAtName];
  const debouncedTargetFieldValue = useDebounce(modifiedData[attribute.targetField], 300);
  const [isCustomized, setIsCustomized] = useState(false);
  const [regenerateLabel, setRegenerateLabel] = useState(null);
  const { post } = useFetchClient();

  const label = intlLabel.id
    ? formatMessage(
        { id: intlLabel.id, defaultMessage: intlLabel.defaultMessage },
        { ...intlLabel.values }
      )
    : name;

  const formattedPlaceholder = placeholder
    ? formatMessage(
        { id: placeholder.id, defaultMessage: placeholder.defaultMessage },
        { ...placeholder.values }
      )
    : '';

  generateUid.current = async (shouldSetInitialValue = false) => {
    setIsLoading(true);

    try {
      const {
        data: { data },
      } = await post(getRequestUrl('uid/generate'), {
        contentTypeUID,
        field: name,
        data: modifiedData,
      });

      onChange({ target: { name, value: data, type: 'text' } }, shouldSetInitialValue);
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      toggleNotification({
        type: 'warning',
        message: formatAPIError(error),
      });
    }
  };

  const checkAvailability = async () => {
    if (!value) {
      return;
    }

    setIsLoading(true);

    try {
      const { data } = await post(getRequestUrl('uid/check-availability'), {
        contentTypeUID,
        field: name,
        value: value ? value.trim() : '',
      });

      setIsLoading(false);
      setAvailability(data);
    } catch (error) {
      setIsLoading(false);
      toggleNotification({
        type: 'warning',
        message: formatAPIError(error),
      });
    }
  };

  // FIXME: we need to find a better way to autofill the input when it is required.
  useEffect(() => {
    if (!value && attribute.required) {
      generateUid.current(true);
    }
  }, [attribute.required, generateUid, value]);

  useEffect(() => {
    if (debouncedValue?.trim().match(UID_REGEX) && debouncedValue !== initialValue) {
      checkAvailability();
    }

    if (!debouncedValue) {
      setAvailability(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialValue, debouncedValue]);

  useEffect(() => {
    let timer;

    if (availability?.isAvailable) {
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
        <Flex position="relative" gap={1}>
          {availability && !regenerateLabel && (
            <TextValidation
              alignItems="center"
              gap={1}
              justifyContent="flex-end"
              available={!!availability?.isAvailable}
              data-not-here-outer
              position="absolute"
              pointerEvents="none"
              right={6}
              width="100px"
            >
              {availability?.isAvailable ? <CheckCircle /> : <ExclamationMarkCircle />}

              <Typography
                textColor={availability.isAvailable ? 'success600' : 'danger600'}
                variant="pi"
              >
                {formatMessage(
                  availability.isAvailable
                    ? {
                        id: 'content-manager.components.uid.available',
                        defaultMessage: 'Available',
                      }
                    : {
                        id: 'content-manager.components.uid.unavailable',
                        defaultMessage: 'Unavailable',
                      }
                )}
              </Typography>
            </TextValidation>
          )}

          {!disabled && (
            <>
              {regenerateLabel && (
                <TextValidation alignItems="center" justifyContent="flex-end" gap={1}>
                  <Typography textColor="primary600" variant="pi">
                    {regenerateLabel}
                  </Typography>
                </TextValidation>
              )}

              <FieldActionWrapper
                onClick={() => generateUid.current()}
                label={formatMessage({
                  id: 'content-manager.components.uid.regenerate',
                  defaultMessage: 'Regenerate',
                })}
                onMouseEnter={handleGenerateMouseEnter}
                onMouseLeave={handleGenerateMouseLeave}
              >
                {isLoading ? (
                  <LoadingWrapper data-testid="loading-wrapper">
                    <Loader />
                  </LoadingWrapper>
                ) : (
                  <Refresh />
                )}
              </FieldActionWrapper>
            </>
          )}
        </Flex>
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
  hint: PropTypes.oneOfType([PropTypes.string, PropTypes.array]),
};

InputUID.defaultProps = {
  disabled: false,
  error: undefined,
  labelAction: undefined,
  placeholder: undefined,
  value: '',
  required: false,
  hint: '',
};

export default InputUID;
