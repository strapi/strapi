export const trimTrailingSlashes = (url: string): string => {
  let end = url.length;

  while (end > 0 && url.charAt(end - 1) === '/') {
    end -= 1;
  }

  return url.slice(0, end);
};
