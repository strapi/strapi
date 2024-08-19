import * as React from 'react';

import { FieldAction, Flex, TextInput, TextInputProps, Typography } from '@strapi/design-system';
import {
  CMEditViewDataManagerContextValue,
  TranslationMessage,
  useAPIErrorHandler,
  useCMEditViewDataManager,
  useFetchClient,
  useNotification,
} from '@strapi/helper-plugin';
import { CheckCircle, ExclamationMarkCircle, Loader, Refresh } from '@strapi/icons';
import { Contracts } from '@strapi/plugin-content-manager/_internal/shared';
import { AxiosError, AxiosResponse } from 'axios';
import { useIntl } from 'react-intl';
import { useMutation, useQuery } from 'react-query';
import styled, { keyframes } from 'styled-components';

import { useDebounce } from '../../hooks/useDebounce';

/* -------------------------------------------------------------------------------------------------
 * InputUID
 * -----------------------------------------------------------------------------------------------*/

const UID_REGEX = /^[A-Za-z0-9-_.~]*$/;

interface InputUIDProps
  extends Pick<TextInputProps, 'disabled' | 'error' | 'hint' | 'labelAction' | 'required'>,
    Required<Pick<CMEditViewDataManagerContextValue, 'onChange'>> {
  contentTypeUID: string;
  intlLabel: TranslationMessage;
  name: string;
  placeholder?: TranslationMessage;
  value: string;
}

const InputUID = React.forwardRef<
  {
    inputWrapperRef: React.MutableRefObject<HTMLDivElement>;
    input: React.MutableRefObject<HTMLInputElement>;
  },
  InputUIDProps
>(
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
      value = '',
      placeholder,
      required,
    },
    forwardedRef
  ) => {
    const [availability, setAvailability] =
      React.useState<Contracts.UID.CheckUIDAvailability.Response>();
    const [showRegenerate, setShowRegenerate] = React.useState(false);
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

    const { data: defaultGeneratedUID, isLoading: isGeneratingDefaultUID } = useQuery({
      queryKey: ['uid', { contentTypeUID, field: name, data: modifiedData }] as const,
      async queryFn({ queryKey }) {
        const [, body] = queryKey;

        const {
          data: { data },
        } = await post<
          Contracts.UID.GenerateUID.Response,
          AxiosResponse<Contracts.UID.GenerateUID.Response>,
          Contracts.UID.GenerateUID.Request['body']
          // @ts-expect-error – TODO: fix this
        >('/content-manager/uid/generate', body);

        return data;
      },
      onError(err) {
        if (err instanceof AxiosError) {
          toggleNotification({
            type: 'warning',
            message: formatAPIError(err),
          });
        }
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

    const { mutate: generateUID, isLoading: isGeneratingUID } = useMutation<
      Contracts.UID.GenerateUID.Response['data'],
      Contracts.UID.GenerateUID.Response['error'],
      Contracts.UID.GenerateUID.Request['body']
    >({
      async mutationFn(body) {
        const {
          data: { data },
        } = await post<
          Contracts.UID.GenerateUID.Response,
          AxiosResponse<Contracts.UID.GenerateUID.Response>,
          Contracts.UID.GenerateUID.Request['body']
        >('/content-manager/uid/generate', body);

        return data;
      },
      onSuccess(data) {
        onChange({ target: { name, value: data, type: 'text' } });
      },
      onError(err) {
        if (err instanceof AxiosError) {
          toggleNotification({
            type: 'warning',
            message: formatAPIError(err),
          });
        }
      },
    });

    const { data: availabilityData, isLoading: isCheckingAvailability } = useQuery({
      queryKey: [
        'uid',
        { contentTypeUID, field: name, value: debouncedValue ? debouncedValue.trim() : '' },
      ] as const,
      async queryFn({ queryKey }) {
        const [, body] = queryKey;

        const { data } = await post<
          Contracts.UID.CheckUIDAvailability.Response,
          AxiosResponse<Contracts.UID.CheckUIDAvailability.Response>,
          Contracts.UID.CheckUIDAvailability.Request['body']
        >('/content-manager/uid/check-availability', body);

        return data;
      },
      enabled: Boolean(
        debouncedValue !== initialData[name] &&
          debouncedValue &&
          UID_REGEX.test(debouncedValue.trim())
      ),
      onError(err) {
        if (err instanceof AxiosError) {
          toggleNotification({
            type: 'warning',
            message: formatAPIError(err),
          });
        }
      },
    });

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
                  // @ts-expect-error – TODO: fix this
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
        value={value}
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

export { InputUID };
export type { InputUIDProps };
