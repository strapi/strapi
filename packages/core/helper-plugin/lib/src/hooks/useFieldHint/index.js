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
      desc
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
        minMaxDescription.push(`min. {min}`);
      }
      if (maxIsNumber) {
        minMaxDescription.push(`max. {max}`);
      }
      let defaultMessage;

      if (minMaxDescription.length === 0) {
        defaultMessage = '';
      } else {
        defaultMessage = `${minMaxDescription.join(' / ')} {units}{br}`;
      }

      return formatMessage(
        {
          id: `content-manager.form.Input.minMaxDescription`,
          defaultMessage,
        },
        {
          min,
          max,
          units,
          br: <br />,
        }
      );
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
