import { SingleSelectOption, SingleSelect, Typography, Field } from '@strapi/design-system';
import { MessageDescriptor, useIntl } from 'react-intl';

import { getDateOfExpiration } from '../../pages/ApiTokens/EditView/utils/getDateOfExpiration';
import { isErrorMessageMessageDescriptor } from '../../utils/forms';

import type { ApiToken } from '../../../../../../shared/contracts/api-token';
import type { TransferToken } from '../../../../../../shared/contracts/transfer';

interface LifeSpanInputProps {
  error?: string | MessageDescriptor;
  value?: string | number | null;
  onChange: (event: { target: { name: string; value: string } }) => void;
  isCreating: boolean;
  token: Partial<TransferToken> | Partial<ApiToken> | null;
}

export const LifeSpanInput = ({
  token,
  error,
  value,
  onChange,
  isCreating,
}: LifeSpanInputProps) => {
  const { formatMessage } = useIntl();

  return (
    <>
      <Field.Root
        error={
          error
            ? formatMessage(
                isErrorMessageMessageDescriptor(error)
                  ? error
                  : { id: error, defaultMessage: error }
              )
            : undefined
        }
        name="lifespan"
        required
      >
        <Field.Label>
          {formatMessage({
            id: 'Settings.tokens.form.duration',
            defaultMessage: 'Token duration',
          })}
        </Field.Label>
        <SingleSelect
          value={value}
          onChange={(value) => {
            // @ts-expect-error – DS v2 won't support number types for select
            onChange({ target: { name: 'lifespan', value } });
          }}
          disabled={!isCreating}
          placeholder="Select"
        >
          <SingleSelectOption value="604800000">
            {formatMessage({
              id: 'Settings.tokens.duration.7-days',
              defaultMessage: '7 days',
            })}
          </SingleSelectOption>
          <SingleSelectOption value="2592000000">
            {formatMessage({
              id: 'Settings.tokens.duration.30-days',
              defaultMessage: '30 days',
            })}
          </SingleSelectOption>
          <SingleSelectOption value="7776000000">
            {formatMessage({
              id: 'Settings.tokens.duration.90-days',
              defaultMessage: '90 days',
            })}
          </SingleSelectOption>
          <SingleSelectOption value="0">
            {formatMessage({
              id: 'Settings.tokens.duration.unlimited',
              defaultMessage: 'Unlimited',
            })}
          </SingleSelectOption>
        </SingleSelect>
        <Field.Error />
      </Field.Root>
      <Typography variant="pi" textColor="neutral600">
        {!isCreating &&
          `${formatMessage({
            id: 'Settings.tokens.duration.expiration-date',
            defaultMessage: 'Expiration date',
            // @ts-expect-error – TODO: fix this.
          })}: ${getDateOfExpiration(token?.createdAt, parseInt(value ?? '', 10))}`}
      </Typography>
    </>
  );
};
