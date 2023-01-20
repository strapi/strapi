/**
 * @param {String} type
 * @param {Number} minimum
 * @param {Number} maximum
 * @returns {'' | 'characters' | 'character'}
 */
const getFieldUnits = ({ type, minimum, maximum }) => {
  if (type === 'number') {
    return '';
  }
  const plural = Math.max(minimum || 0, maximum || 0) > 1;

  if (plural) {
    return 'characters';
  }

  return 'character';
};

export default getFieldUnits;
