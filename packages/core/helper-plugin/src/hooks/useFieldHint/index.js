import React from 'react';
import { useIntl } from 'react-intl';
import { getFieldUnits, getMinMax } from './utils';

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

export default useFieldHint;
