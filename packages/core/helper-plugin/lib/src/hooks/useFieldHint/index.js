import React, { useEffect, useState } from 'react';
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
  const buildDescription = () =>
    description
      ? formatMessage(
          { id: description.id, defaultMessage: description.defaultMessage },
          { ...description.values }
        )
      : '';

  /**
   * Constructs a suitable description of a field's minimum and maximum limits
   * @returns {Array}
   */
  const buildMinMaxHint = () => {
    const minIsNumber = typeof minimum === 'number';
    const maxIsNumber = typeof maximum === 'number';

    if (!minIsNumber && !maxIsNumber) {
      return [];
    }

    const minMaxDescription = [];

    if (minIsNumber) {
      minMaxDescription.push(`min. {minimum}`);
    }
    if (maxIsNumber) {
      minMaxDescription.push(`max. {maximum}`);
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
        minimum,
        maximum,
        units,
        br: <br />,
      }
    );
  };

  useEffect(() => {
    const description = buildDescription();
    const minMaxHint = buildMinMaxHint();

    if (description.length === 0 && minMaxHint.length === 0) {
      setHint('');

      return;
    }
    setHint([...minMaxHint, description]);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [units, description, minimum, maximum]);

  return { hint };
};

export default useFieldHint;
