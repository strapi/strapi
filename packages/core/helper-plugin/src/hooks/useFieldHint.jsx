/* eslint-disable check-file/filename-naming-convention */ // this is disabled because the file name is correct however, we do use JSX in this file.
import React from 'react';

import { useIntl } from 'react-intl';

/**
 * @description
 * A hook for generating the hint for a field
 * @type {
 * ({ description: { id: string, defaultMessage: string },
 *    type: string,
 *    fieldSchema: { minLength?: number|string; maxLength?: number|string; max?: number|string; min?: number|string }
 * })
 * => { hint: ''|Array }
 * }
 */
const useFieldHint = ({ description, fieldSchema, type }) => {
  const { formatMessage } = useIntl();

  /**
   * @returns {String}
   */
  const buildDescription = () =>
    description?.id
      ? formatMessage(
          { id: description.id, defaultMessage: description.defaultMessage },
          { ...description.values }
        )
      : '';

  /**
   * @returns {''|Array}
   */
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

/**
 * @type { ({ type?: string; minimum?: number; maximum: number; } ) => {
 * message?: {id: string, defaultMessage: string}; values?: {maxValue: number} } }
 */
const getFieldUnits = ({ type, minimum, maximum }) => {
  if (['biginteger', 'integer', 'number'].includes(type)) {
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

/**
 * Get the minimum and maximum limits for an input
 * @type {
 * (fieldSchema: { minLength?: number|string; maxLength?: number|string; max?: number|string; min?: number|string } )
 * => { maximum: number; minimum: number } }
 */
const getMinMax = (fieldSchema) => {
  if (!fieldSchema) {
    return { maximum: undefined, minimum: undefined };
  }

  const { minLength, maxLength, max, min } = fieldSchema;

  let minimum;
  let maximum;

  const parsedMin = parseInt(min, 10);
  const parsedMinLength = parseInt(minLength, 10);

  if (!Number.isNaN(parsedMin)) {
    minimum = parsedMin;
  } else if (!Number.isNaN(parsedMinLength)) {
    minimum = parsedMinLength;
  }

  const parsedMax = parseInt(max, 10);
  const parsedMaxLength = parseInt(maxLength, 10);

  if (!Number.isNaN(parsedMax)) {
    maximum = parsedMax;
  } else if (!Number.isNaN(parsedMaxLength)) {
    maximum = parsedMaxLength;
  }

  return { maximum, minimum };
};

export { useFieldHint };
