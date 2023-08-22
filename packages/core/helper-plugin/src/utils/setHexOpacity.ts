/**
 * Set an opacity to a hex value.
 *
 * @param {string} hex - Hex value
 * @example '#12100E'
 * @param {number} alpha - Alpha opacity value
 * @example 0.2
 */
const setHexOpacity = (hex: string, alpha: number) =>
  `${hex}${Math.floor(alpha * 255)
    .toString(16)
    .padStart(2, '0')}`;

export { setHexOpacity };
