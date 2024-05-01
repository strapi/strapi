import * as React from 'react';

import {
  type InputProps,
  useField,
  useForm,
  useNotification,
  useAPIErrorHandler,
  useQueryParams,
  useFocusInputField,
} from '@strapi/admin/strapi-admin';
import { FieldAction, Flex, TextInput, Typography, useComposedRefs } from '@strapi/design-system';
import { CheckCircle, WarningCircle, Loader, ArrowClockwise } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { styled, keyframes } from 'styled-components';

import { useDebounce } from '../../../../hooks/useDebounce';
import { useDoc } from '../../../../hooks/useDocument';
import {
  useGenerateUIDMutation,
  useGetAvailabilityQuery,
  useGetDefaultUIDQuery,
} from '../../../../services/uid';
import { buildValidParams } from '../../../../utils/api';

import type { CheckUIDAvailability } from '../../../../../../shared/contracts/uid';
import type { Schema } from '@strapi/types';

/* -------------------------------------------------------------------------------------------------
 * InputUID
 * -----------------------------------------------------------------------------------------------*/

const UID_REGEX = /^[A-Za-z0-9-_.~]*$/;

interface UIDInputProps extends Omit<InputProps, 'type'> {
  type: Schema.Attribute.TypeOf<Schema.Attribute.UID>;
}

const UIDInput = React.forwardRef<any, UIDInputProps>((props, ref) => {
  const { model, id } = useDoc();
  const allFormValues = useForm('InputUID', (form) => form.values);
  const [availability, setAvailability] = React.useState<CheckUIDAvailability.Response>();
  const [showRegenerate, setShowRegenerate] = React.useState(false);
  const field = useField(props.name);
  const debouncedValue = useDebounce(field.value, 300);
  const { toggleNotification } = useNotification();
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
      field: props.name,
      data: {
        id: id ?? '',
        ...allFormValues,
      },
      params,
    },
    {
      skip: field.value || !props.required,
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
      field.onChange(props.name, defaultGeneratedUID);
    }
  }, [defaultGeneratedUID, field, props.name]);

  const [generateUID, { isLoading: isGeneratingUID }] = useGenerateUIDMutation();

  const handleRegenerateClick = async () => {
    try {
      const res = await generateUID({
        contentTypeUID: model,
        field: props.name,
        data: { id: id ?? '', ...allFormValues },
        params,
      });

      if ('data' in res) {
        field.onChange(props.name, res.data);
      } else {
        toggleNotification({
          type: 'danger',
          message: formatAPIError(res.error),
        });
      }
    } catch (err) {
      toggleNotification({
        type: 'danger',
        message: formatMessage({
          id: 'notification.error',
          defaultMessage: 'An error occurred.',
        }),
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
      field: props.name,
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

  const fieldRef = useFocusInputField(props.name);
  const composedRefs = useComposedRefs(ref, fieldRef);

  return (
    // @ts-expect-error – label _could_ be a ReactNode since it's a child, this should be fixed in the DS.
    <TextInput
      ref={composedRefs}
      disabled={props.disabled}
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
              {availability?.isAvailable ? <CheckCircle /> : <WarningCircle />}

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

          {!props.disabled && (
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
                  <ArrowClockwise />
                )}
              </FieldActionWrapper>
            </>
          )}
        </Flex>
      }
      onChange={field.onChange}
      value={field.value ?? ''}
      {...props}
    />
  );
});

/* -------------------------------------------------------------------------------------------------
 * FieldActionWrapper
 * -----------------------------------------------------------------------------------------------*/

const FieldActionWrapper = styled(FieldAction)`
  svg {
    height: 1.6rem;
    width: 1.6rem;
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
    height: 1.2rem;
    width: 1.2rem;

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
