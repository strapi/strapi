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

export default getFieldUnits;
