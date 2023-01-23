import React, { useEffect, useState, useCallback } from 'react';
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
  const [hint, setHint] = useState([]);

  /**
   * @returns {String}
   */
  const buildDescription = useCallback(
    (desc) =>
      desc?.id
        ? formatMessage({ id: desc.id, defaultMessage: desc.defaultMessage }, { ...desc.values })
        : '',
    [formatMessage]
  );

  /**
   * @returns {''|Array}
   */
  const buildHint = useCallback(
    (desc) => {
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

      if (!desc?.id && !hasMinOrMax) {
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
          description: buildDescription(desc),
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
    },
    [formatMessage, buildDescription, fieldSchema, type]
  );

  useEffect(() => {
    setHint(buildHint(description));
  }, [description, buildHint]);

  return { hint };
};

export default useFieldHint;
