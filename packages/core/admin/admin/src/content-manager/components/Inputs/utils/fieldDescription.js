import React from 'react';

/**
 * Constructs a suitable description, taking into account a fields minimum and
 * maximum length
 *
 * @param {String} description - the fields description
 * @param {Number} minLength - the minimum length of the field
 * @param {Number} maxLength -  the maximum length of the field
 * @returns
 */
const buildDescription = (description, minLength, maxLength) => {
  const minMaxDescription = [];

  if (minLength) {
    minMaxDescription.push(`min. ${minLength}`);
  }
  if (minLength && maxLength) {
    minMaxDescription.push(`/`);
  }
  if (maxLength) {
    minMaxDescription.push(`max. ${maxLength}`);
  }
  if (minMaxDescription.length > 0) {
    minMaxDescription.push(`characters{br}`);
  }

  return {
    id: description,
    defaultMessage: `${minMaxDescription.join(' ')}${description}`,
    values: {
      br: <br />,
    },
  };
};

export default buildDescription;
