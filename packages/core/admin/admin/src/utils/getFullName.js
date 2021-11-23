/**
 * Get fullname from firstname+lastname joined with a space
 * Handle missing lastname
 * @param {string} firstname
 * @param {string} lastname
 */
export default (firstname, lastname = '') => {
  return [firstname, lastname].filter(str => str).join(' ');
};
