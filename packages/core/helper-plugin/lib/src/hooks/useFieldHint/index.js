import React, { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';

/**
 * @description
 * A hook for generating the hint for a field
 * @param {Object} description - the description of the field
 * @param {Number} minimum - the minimum length or value of the field
 * @param {Number} maximum - the maximum length or value of the field
 * @param {Boolean} isNumber - whether this is a number field
 * @returns {Array}
 */
const useFieldHint = ({ description, minimum, maximum, isNumber = false }) => {
  const { formatMessage } = useIntl();

  const [fieldHint, setFieldHint] = useState([]);

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
    if (typeof minimum !== 'number' && typeof maximum !== 'number') {
      return [];
    }

    const minMaxDescription = [];

    if (typeof minimum === 'number' && minimum > 0) {
      minMaxDescription.push(`min. {minimum}`);
    }
    if (typeof maximum === 'number' && maximum > 0) {
      minMaxDescription.push(`max. {maximum}`);
    }

    let defaultMessage;

    if (minMaxDescription.length === 0) {
      defaultMessage = '';
    } else if (isNumber) {
      defaultMessage = `${minMaxDescription.join(' / ')}{br}`;
    } else {
      defaultMessage = `${minMaxDescription.join(
        ' / '
      )} {isPlural, select, true {characters} other {character}}{br}`;
    }

    return formatMessage(
      {
        id: `content-manager.form.Input.minMaxDescription${isNumber ? '.number' : ''}`,
        defaultMessage,
      },
      {
        minimum,
        maximum,
        isPlural: Math.max(minimum || 0, maximum || 0) > 1,
        br: <br />,
      }
    );
  };

  useEffect(() => {
    const description = buildDescription();
    const minMaxHint = buildMinMaxHint();

    if (description.length === 0 && minMaxHint.length === 0) {
      setFieldHint('');

      return;
    }
    setFieldHint([...minMaxHint, description]);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNumber, description, minimum, maximum]);

  return { fieldHint };
};

export default useFieldHint;
