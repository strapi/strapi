/* eslint-disable check-file/filename-naming-convention */ // this is disabled because the file name is correct however, we do use JSX in this file.
import React from 'react';

import { useIntl } from 'react-intl';

import type { MessageDescriptor, PrimitiveType } from 'react-intl';

type FieldSchema = {
  minLength?: number | string;
  maxLength?: number | string;
  max?: number | string;
  min?: number | string;
};
export interface UseFieldHintProps {
  description?: MessageDescriptor & { values?: Record<string, PrimitiveType> };
  fieldSchema?: FieldSchema;
  type?: string;
}

/**
 * @description
 * A hook for generating the hint for a field
 */
const useFieldHint = ({ description, fieldSchema, type }: UseFieldHintProps) => {
  const { formatMessage } = useIntl();

  const buildDescription = () =>
    description?.id
      ? formatMessage(
          { id: description.id, defaultMessage: description.defaultMessage },
          { ...description.values }
        )
      : '';

  const buildHint = () => {
    const { maximum, minimum } = getMinMax(fieldSchema);
    const units = getFieldUnits({
      type,
      minimum,
      maximum,
    });

    const minIsNumber = typeof minimum === 'number';
    const maxIsNumber = typeof maximum === 'number';
    const hasMinAndMax = maxIsNumber && minIsNumber;
    const hasMinOrMax = maxIsNumber || minIsNumber;

    if (!description?.id && !hasMinOrMax) {
      return '';
    }

    return formatMessage(
      {
        id: 'content-manager.form.Input.hint.text',
        defaultMessage:
          '{min, select, undefined {} other {min. {min}}}{divider}{max, select, undefined {} other {max. {max}}}{unit}{br}{description}',
      },
      {
        min: minimum,
        max: maximum,
        description: buildDescription(),
        unit: units?.message && hasMinOrMax ? formatMessage(units.message, units.values) : null,
        divider: hasMinAndMax
          ? formatMessage({
              id: 'content-manager.form.Input.hint.minMaxDivider',
              defaultMessage: ' / ',
            })
          : null,
        br: hasMinOrMax ? <br /> : null,
      }
    );
  };

  return { hint: buildHint() };
};

const getFieldUnits = ({
  type,
  minimum,
  maximum,
}: {
  type?: string;
  minimum?: number;
  maximum?: number;
}) => {
  if (type && ['biginteger', 'integer', 'number'].includes(type)) {
    return {};
  }
  const maxValue = Math.max(minimum || 0, maximum || 0);

  return {
    message: {
      id: 'content-manager.form.Input.hint.character.unit',
      defaultMessage: '{maxValue, plural, one { character} other { characters}}',
    },
    values: {
      maxValue,
    },
  };
};

const getMinMax = (fieldSchema?: FieldSchema) => {
  if (!fieldSchema) {
    return { maximum: undefined, minimum: undefined };
  }

  const { minLength, maxLength, max, min } = fieldSchema;

  let minimum;
  let maximum;

  const parsedMin = Number(min);
  const parsedMinLength = Number(minLength);

  if (!Number.isNaN(parsedMin)) {
    minimum = parsedMin;
  } else if (!Number.isNaN(parsedMinLength)) {
    minimum = parsedMinLength;
  }

  const parsedMax = Number(max);
  const parsedMaxLength = Number(maxLength);

  if (!Number.isNaN(parsedMax)) {
    maximum = parsedMax;
  } else if (!Number.isNaN(parsedMaxLength)) {
    maximum = parsedMaxLength;
  }

  return { maximum, minimum };
};

export { useFieldHint };
