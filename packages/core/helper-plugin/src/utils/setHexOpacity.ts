const setHexOpacity = (hex: string, alpha: number) =>
  `${hex}${Math.floor(alpha * 255)
    .toString(16)
    .padStart(2, '0')}`;

export { setHexOpacity };
