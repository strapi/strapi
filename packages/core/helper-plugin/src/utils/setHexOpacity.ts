/**
 * Set an opacity to a hex value.
 *
 * @deprecated This function will be removed in the next major release. Use the native CSS opacity property instead.
 */
const setHexOpacity = (hex: string, alpha: number) =>
  `${hex}${Math.floor(alpha * 255)
    .toString(16)
    .padStart(2, '0')}`;

export { setHexOpacity };
