import * as React from 'react';

import { FieldAction, Flex, TextInput, Typography } from '@strapi/design-system';
import {
  useAPIErrorHandler,
  useFocusInputField,
  useNotification,
  useQueryParams,
} from '@strapi/helper-plugin';
import { CheckCircle, ExclamationMarkCircle, Loader, Refresh } from '@strapi/icons';
import { Contracts } from '@strapi/plugin-content-manager/_internal/shared';
import { useIntl } from 'react-intl';
import styled, { keyframes } from 'styled-components';

import { useDebounce } from '../../../../../hooks/useDebounce';
import { type InputProps, useField, useForm } from '../../../../components/Form';
import { useDoc } from '../../../../hooks/useDocument';
import {
  useGenerateUIDMutation,
  useGetAvailabilityQuery,
  useGetDefaultUIDQuery,
} from '../../../../services/uid';
import { buildValidParams } from '../../../../utils/api';
import { useComposedRefs } from '../../../../utils/refs';

import type { Attribute } from '@strapi/types';

/* -------------------------------------------------------------------------------------------------
 * InputUID
 * -----------------------------------------------------------------------------------------------*/

const UID_REGEX = /^[A-Za-z0-9-_.~]*$/;

interface UIDInputProps extends Omit<InputProps, 'type'> {
  type: Attribute.UID['type'];
}

const UIDInput = React.forwardRef<any, UIDInputProps>(
  ({ hint, disabled, label, name, placeholder, required }, ref) => {
    const { model, id } = useDoc();
    const allFormValues = useForm('InputUID', (form) => form.values);
    const [availability, setAvailability] =
      React.useState<Contracts.UID.CheckUIDAvailability.Response>();
    const [showRegenerate, setShowRegenerate] = React.useState(false);
    const field = useField(name);
    const debouncedValue = useDebounce(field.value, 300);
    const toggleNotification = useNotification();
    const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler();
    const { formatMessage } = useIntl();
    const [{ query }] = useQueryParams();
    const params = React.useMemo(() => buildValidParams(query), [query]);

    const {
      data: defaultGeneratedUID,
      isLoading: isGeneratingDefaultUID,
      error: apiError,
    } = useGetDefaultUIDQuery(
      {
        contentTypeUID: model,
        field: name,
        data: {
          id: id ?? '',
          ...allFormValues,
        },
        params,
      },
      {
        skip: field.value || !required,
      }
    );

    React.useEffect(() => {
      if (apiError) {
        toggleNotification({
          type: 'warning',
          message: formatAPIError(apiError),
        });
      }
    }, [apiError, formatAPIError, toggleNotification]);

    /**
     * If the defaultGeneratedUID is available, then we set it as the value,
     * but we also want to set it as the initialValue too.
     */
    React.useEffect(() => {
      if (defaultGeneratedUID && field.value === undefined) {
        field.onChange(name, defaultGeneratedUID);
      }
    }, [defaultGeneratedUID, field, name]);

    const [generateUID, { isLoading: isGeneratingUID }] = useGenerateUIDMutation();

    const handleRegenerateClick = async () => {
      // eslint-disable-next-line no-console
      console.log('allFormValues', allFormValues);
      try {
        const res = await generateUID({
          contentTypeUID: model,
          field: name,
          data: { id: id ?? '', ...allFormValues },
          params,
        });

        if ('data' in res) {
          field.onChange(name, res.data);
        } else {
          toggleNotification({
            type: 'warning',
            message: formatAPIError(res.error),
          });
        }
      } catch (err) {
        toggleNotification({
          type: 'warning',
          message: { id: 'notification.error', defaultMessage: 'An error occurred.' },
        });
      }
    };

    const {
      data: availabilityData,
      isLoading: isCheckingAvailability,
      error: availabilityError,
    } = useGetAvailabilityQuery(
      {
        contentTypeUID: model,
        field: name,
        value: debouncedValue ? debouncedValue.trim() : '',
        params,
      },
      {
        skip: !Boolean(
          debouncedValue !== field.initialValue &&
            debouncedValue &&
            UID_REGEX.test(debouncedValue.trim())
        ),
      }
    );

    React.useEffect(() => {
      if (availabilityError) {
        toggleNotification({
          type: 'warning',
          message: formatAPIError(availabilityError),
        });
      }
    }, [availabilityError, formatAPIError, toggleNotification]);

    React.useEffect(() => {
      /**
       * always store the data in state because that way as seen below
       * we can then remove the data to stop showing the label.
       */
      setAvailability(availabilityData);

      let timer: number;

      if (availabilityData?.isAvailable) {
        timer = window.setTimeout(() => {
          setAvailability(undefined);
        }, 4000);
      }

      return () => {
        if (timer) {
          clearTimeout(timer);
        }
      };
    }, [availabilityData]);

    const isLoading = isGeneratingDefaultUID || isGeneratingUID || isCheckingAvailability;

    const fieldRef = useFocusInputField(name);
    const composedRefs = useComposedRefs(ref, fieldRef);

    return (
      <TextInput
        ref={composedRefs}
        disabled={disabled}
        error={field.error}
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
                  onClick={handleRegenerateClick}
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
        name={name}
        onChange={field.onChange}
        placeholder={placeholder}
        value={field.value ?? ''}
        required={required}
      />
    );
  }
);

/* -------------------------------------------------------------------------------------------------
 * FieldActionWrapper
 * -----------------------------------------------------------------------------------------------*/

const FieldActionWrapper = styled(FieldAction)`
  svg {
    height: 1rem;
    width: 1rem;
    path {
      fill: ${({ theme }) => theme.colors.neutral400};
    }
  }

  svg:hover {
    path {
      fill: ${({ theme }) => theme.colors.primary600};
    }
  }
`;

/* -------------------------------------------------------------------------------------------------
 * TextValidation
 * -----------------------------------------------------------------------------------------------*/

const TextValidation = styled(Flex)<{ available?: boolean }>`
  svg {
    height: ${12 / 16}rem;
    width: ${12 / 16}rem;

    path {
      fill: ${({ theme, available }) =>
        available ? theme.colors.success600 : theme.colors.danger600};
    }
  }
`;

/* -------------------------------------------------------------------------------------------------
 * LoadingWrapper
 * -----------------------------------------------------------------------------------------------*/

const rotation = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(359deg);
  }
`;

const LoadingWrapper = styled(Flex)`
  animation: ${rotation} 2s infinite linear;
`;

export { UIDInput };
export type { UIDInputProps };
