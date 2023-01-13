import React from 'react';

/**
 * Constructs a suitable description, taking into account a fields minimum and
 * maximum length
 *
 * @param {String} type - the type of field
 * @param {Number} min - the minimum length or value of the field
 * @param {Number} max -  the maximum length or value of the field
 * @returns {(null|Object)}
 */
const buildMinMaxDescription = (type, min, max) => {
  if (!(typeof min === 'number' || typeof max === 'number')) {
    return null;
  }
  if (
    !['number', 'email', 'timestamp', 'text', 'string', 'password', 'textarea', 'uid'].includes(
      type
    )
  ) {
    return null;
  }

  const minMaxDescription = [];

  if (min) {
    minMaxDescription.push(`min. {min}`);
  }
  if (max) {
    minMaxDescription.push(`max. {max}`);
  }

  return {
    id: 'content-manager.form.Input.minMaxDescription',
    defaultMessage:
      minMaxDescription.length === 0
        ? ``
        : `${minMaxDescription.join(' / ')}${type === 'number' ? '{br}' : ' characters{br}'}`,
    values: {
      min,
      max,
      br: <br />,
    },
  };
};

export default buildMinMaxDescription;
