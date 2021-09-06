/* eslint-disable prefer-template */
export default (location, n) => {
  const half = location.split(n + '=')[1];

  if (half !== undefined) {
    try {
      return decodeURIComponent(half.split('&')[0]);
    } catch (e) {
      return null;
    }
  }

  return null;
};
