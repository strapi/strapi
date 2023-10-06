import * as React from 'react';

import { Flex, TextInput, Typography } from '@strapi/design-system';
import {
  useAPIErrorHandler,
  useCMEditViewDataManager,
  useFetchClient,
  useNotification,
} from '@strapi/helper-plugin';
import { CheckCircle, ExclamationMarkCircle, Loader, Refresh } from '@strapi/icons';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { useMutation, useQuery } from 'react-query';

import { useDebounce } from '../../../hooks/useDebounce';

import { FieldActionWrapper, LoadingWrapper, TextValidation } from './endActionStyle';
import UID_REGEX from './regex';

const InputUID = React.forwardRef(
  (
    {
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
    },
    forwardedRef
  ) => {
    const [availability, setAvailability] = React.useState(null);
    const [showRegenerate, setShowRegenerate] = React.useState(false);
    /**
     * @type {string | null}
     */
    const debouncedValue = useDebounce(value, 300);
    const { modifiedData, initialData } = useCMEditViewDataManager();
    const toggleNotification = useNotification();
    const { formatAPIError } = useAPIErrorHandler();
    const { formatMessage } = useIntl();
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

    /**
     * @type {import('react-query').UseQueryResult<string>}
     */
    const { data: defaultGeneratedUID, isLoading: isGeneratingDefaultUID } = useQuery({
      queryKey: ['uid', { contentTypeUID, field: name, data: modifiedData }],
      async queryFn({ queryKey }) {
        const [, body] = queryKey;

        const {
          data: { data },
        } = await post('/content-manager/uid/generate', body);

        return data;
      },
      onError(err) {
        toggleNotification({
          type: 'warning',
          message: formatAPIError(err),
        });
      },
      enabled: !value && required,
    });

    /**
     * If the defaultGeneratedUID is available, then we set it as the value,
     * but we also want to set it as the initialValue too.
     */
    React.useEffect(() => {
      if (defaultGeneratedUID) {
        onChange({ target: { name, value: defaultGeneratedUID, type: 'text' } }, true);
      }
    }, [defaultGeneratedUID, name, onChange]);

    const { mutate: generateUID, isLoading: isGeneratingUID } = useMutation({
      async mutationFn(body) {
        const {
          data: { data },
        } = await post('/content-manager/uid/generate', body);

        return data;
      },
      onSuccess(data) {
        onChange({ target: { name, value: data, type: 'text' } });
      },
      onError(err) {
        toggleNotification({
          type: 'warning',
          message: formatAPIError(err),
        });
      },
    });

    /**
     * @type {import('react-query').UseQueryResult<{ isAvailable: boolean }>
     */
    const { data: availabilityData, isLoading: isCheckingAvailability } = useQuery({
      queryKey: [
        'uid',
        { contentTypeUID, field: name, value: debouncedValue ? debouncedValue.trim() : '' },
      ],
      async queryFn({ queryKey }) {
        const [, body] = queryKey;

        const { data } = await post('/content-manager/uid/check-availability', body);

        return data;
      },
      enabled: Boolean(
        debouncedValue !== initialData[name] &&
          debouncedValue &&
          UID_REGEX.test(debouncedValue.trim())
      ),
      onError(err) {
        toggleNotification({
          type: 'warning',
          message: formatAPIError(err),
        });
      },
    });

    React.useEffect(() => {
      /**
       * always store the data in state because that way as seen below
       * we can then remove the data to stop showing the label.
       */
      setAvailability(availabilityData);

      let timer;

      if (availabilityData?.isAvailable) {
        timer = setTimeout(() => {
          setAvailability(null);
        }, 4000);
      }

      return () => {
        if (timer) {
          clearTimeout(timer);
        }
      };
    }, [availabilityData]);

    const isLoading = isGeneratingDefaultUID || isGeneratingUID || isCheckingAvailability;

    return (
      <TextInput
        ref={forwardedRef}
        disabled={disabled}
        error={error}
        endAction={
          <Flex position="relative" gap={1}>
            {availability && !showRegenerate && (
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
                {showRegenerate && (
                  <TextValidation alignItems="center" justifyContent="flex-end" gap={1}>
                    <Typography textColor="primary600" variant="pi">
                      {formatMessage({
                        id: 'content-manager.components.uid.regenerate',
                        defaultMessage: 'Regenerate',
                      })}
                    </Typography>
                  </TextValidation>
                )}

                <FieldActionWrapper
                  onClick={() => generateUID({ contentTypeUID, field: name, data: modifiedData })}
                  label={formatMessage({
                    id: 'content-manager.components.uid.regenerate',
                    defaultMessage: 'Regenerate',
                  })}
                  onMouseEnter={() => setShowRegenerate(true)}
                  onMouseLeave={() => setShowRegenerate(false)}
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
        onChange={onChange}
        placeholder={formattedPlaceholder}
        value={value || ''}
        required={required}
      />
    );
  }
);

InputUID.propTypes = {
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

export { InputUID };
