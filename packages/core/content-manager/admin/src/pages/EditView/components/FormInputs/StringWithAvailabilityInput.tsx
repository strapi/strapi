import * as React from 'react';

import {
  type FormErrors,
  type InputProps,
  useField,
  useForm,
  useFocusInputField,
  useNotification,
  useAPIErrorHandler,
  useQueryParams,
} from '@strapi/admin/strapi-admin';
import {
  Field,
  Flex,
  FlexComponent,
  TextInput,
  Typography,
  useComposedRefs,
} from '@strapi/design-system';
import { CheckCircle, WarningCircle, Loader } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { useDebounce } from '../../../../hooks/useDebounce';
import { useDocumentContext } from '../../../../hooks/useDocumentContext';
import { useGetAvailabilityQuery } from '../../../../services/uid';
import { buildValidParams } from '../../../../utils/api';

const UNIQUE_INDEX_ERROR_MESSAGE_ID = 'apiError.This attribute must be unique';

/**
 * String/text input that shows "Available" / "Unavailable" for attributes with a custom unique index.
 * Same mechanism as UID: checks the database for the appropriate uniqueness (variant or global),
 * shows the badge, and sets a field-level validation error when unavailable so the user sees the
 * error before save/publish.
 */
const StringWithAvailabilityInput = React.forwardRef<
  HTMLInputElement,
  InputProps & { name: string }
>(({ hint, label, labelAction, name, required, ...props }, ref) => {
  const { currentDocumentMeta } = useDocumentContext('StringWithAvailabilityInput');
  const field = useField(name);
  const setErrors = useForm('StringWithAvailabilityInput', (state) => state.setErrors);
  const formErrors = useForm('StringWithAvailabilityInput', (state) => state.errors);
  const { toggleNotification } = useNotification();
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler();
  // Short debounce so the check runs automatically as soon as the user stops typing (like UID)
  const debouncedValue = useDebounce(field.value, 250);
  const [availability, setAvailability] = React.useState<{ isAvailable: boolean } | undefined>();
  const { formatMessage } = useIntl();
  const [{ query }] = useQueryParams();
  const params = React.useMemo(() => buildValidParams(query), [query]);
  const unavailableMessage = formatMessage(
    {
      id: UNIQUE_INDEX_ERROR_MESSAGE_ID,
      defaultMessage: 'This attribute must be unique',
    },
    { field: label || name }
  );

  const valueToCheck =
    debouncedValue != null && debouncedValue !== '' ? String(debouncedValue).trim() : '';
  const shouldCheck = valueToCheck !== '';

  const {
    data: availabilityData,
    isLoading: isCheckingAvailability,
    error: availabilityError,
  } = useGetAvailabilityQuery(
    {
      contentTypeUID: currentDocumentMeta.model,
      field: name,
      value: valueToCheck,
      documentId: currentDocumentMeta.documentId ?? undefined,
      params,
    },
    { skip: !shouldCheck }
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
    if (
      availabilityData &&
      'isAvailable' in availabilityData &&
      typeof availabilityData.isAvailable === 'boolean'
    ) {
      setAvailability({ isAvailable: availabilityData.isAvailable });
      if (availabilityData.isAvailable) {
        const timer = window.setTimeout(() => setAvailability(undefined), 4000);
        return () => clearTimeout(timer);
      }
    }
  }, [availabilityData]);

  // Set or clear field-level validation error so user sees error before save/publish (same as UID).
  React.useEffect(() => {
    const currentError = formErrors[name as keyof typeof formErrors];
    const errorsRecord = formErrors as Record<string, string | undefined>;

    if (!shouldCheck) {
      if (currentError) {
        const { [name]: _omit, ...rest } = errorsRecord;
        setErrors(rest as FormErrors);
      }
      return;
    }
    if (
      availabilityData &&
      'isAvailable' in availabilityData &&
      typeof availabilityData.isAvailable === 'boolean'
    ) {
      if (availabilityData.isAvailable) {
        if (currentError) {
          const { [name]: _omit, ...rest } = errorsRecord;
          setErrors(rest as FormErrors);
        }
      } else if (currentError !== unavailableMessage) {
        // Set the error when unavailable so the field shows red immediately (automatic, like UID)
        setErrors({ ...errorsRecord, [name]: unavailableMessage } as FormErrors);
      }
    }
  }, [availabilityData, formErrors, name, setErrors, shouldCheck, unavailableMessage]);

  const fieldRef = useFocusInputField(name);
  const composedRefs = useComposedRefs(ref, fieldRef);

  const shouldShowAvailability = debouncedValue != null && availability !== undefined;

  return (
    <Field.Root hint={hint} name={name} error={field.error} required={required}>
      <Field.Label action={labelAction}>{label}</Field.Label>
      <TextInput
        ref={composedRefs as React.Ref<HTMLInputElement>}
        disabled={props.disabled}
        endAction={
          <Flex position="relative" gap={1}>
            {isCheckingAvailability && (
              <Flex alignItems="center" justifyContent="flex-end" width="100px">
                <Loader />
              </Flex>
            )}
            {!isCheckingAvailability && shouldShowAvailability && (
              <TextValidation
                alignItems="center"
                gap={1}
                justifyContent="flex-end"
                $available={!!availability?.isAvailable}
                position="absolute"
                pointerEvents="none"
                right={6}
                width="100px"
              >
                {availability?.isAvailable ? <CheckCircle /> : <WarningCircle />}
                <Typography
                  textColor={availability?.isAvailable ? 'success600' : 'danger600'}
                  variant="pi"
                >
                  {formatMessage(
                    availability?.isAvailable
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
          </Flex>
        }
        onChange={field.onChange}
        value={field.value ?? ''}
        {...props}
        type="text"
      />
      <Field.Error />
      <Field.Hint />
    </Field.Root>
  );
});

const TextValidation = styled<FlexComponent>(Flex)<{ $available?: boolean }>`
  svg {
    height: 1.2rem;
    width: 1.2rem;
    path {
      fill: ${({ theme, $available }) =>
        $available ? theme.colors.success600 : theme.colors.danger600};
    }
  }
`;

export { StringWithAvailabilityInput };
