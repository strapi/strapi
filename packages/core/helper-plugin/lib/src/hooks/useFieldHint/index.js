import React, { useEffect, useState, useCallback } from 'react';
import { useIntl } from 'react-intl';

/**
 * @description
 * A hook for generating the hint for a field
 * @param {Object} description - the description of the field
 * @param {Number} minimum - the minimum length or value of the field
 * @param {Number} maximum - the maximum length or value of the field
 * @param {String} units
 */
const useFieldHint = ({ description, minimum, maximum, units }) => {
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
   * Constructs a suitable description of a field's minimum and maximum limits
   * @param {Number} minimum - the minimum length or value of the field
   * @param {Number} maximum - the maximum length or value of the field
   * @param {String} units
   * @returns {Array}
   */
  const buildMinMaxHint = useCallback(
    (min, max, units) => {
      const minIsNumber = typeof min === 'number';
      const maxIsNumber = typeof max === 'number';

      if (!minIsNumber && !maxIsNumber) {
        return [];
      }
      const minMaxDescription = [];

      if (minIsNumber) {
        minMaxDescription.push(
          formatMessage(
            {
              id: 'content-manager.form.Input.minimum',
              defaultMessage: 'min. {min}',
            },
            {
              min,
            }
          )
        );
      }
      if (minIsNumber && maxIsNumber) {
        const connector = ' / ';
        minMaxDescription.push(
          formatMessage({
            id: connector,
            defaultMessage: connector,
          })
        );
      }
      if (maxIsNumber) {
        minMaxDescription.push(
          formatMessage(
            {
              id: 'content-manager.form.Input.maximum',
              defaultMessage: 'max. {max}',
            },
            {
              max,
            }
          )
        );
      }
      minMaxDescription.push(
        formatMessage(
          {
            id: 'content-manager.form.Input.units',
            defaultMessage: ' {units}{br}',
          },
          {
            units,
            br: <br />,
          }
        )
      );

      return minMaxDescription;
    },
    [formatMessage]
  );

  useEffect(() => {
    const newDescription = buildDescription(description);
    const minMaxHint = buildMinMaxHint(minimum, maximum, units);

    if (newDescription.length === 0 && minMaxHint.length === 0) {
      setHint('');

      return;
    }
    setHint([...minMaxHint, newDescription]);
  }, [units, description, minimum, maximum, buildMinMaxHint, buildDescription]);

  return { hint };
};

export default useFieldHint;
