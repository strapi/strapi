export const truncateMiddle = (str: string, maxLength: number): string => {
  if (str.length <= maxLength || maxLength <= 3) {
    return str;
  }
  const charsToShow = maxLength - 3;
  const frontChars = Math.ceil(charsToShow / 2);
  const backChars = Math.floor(charsToShow / 2);
  return `${str.slice(0, frontChars)}...${str.slice(str.length - backChars)}`;
};
