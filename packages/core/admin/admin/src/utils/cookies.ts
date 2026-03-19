/**
 * Retrieves the value of a specified cookie.
 *
 * @param name - The name of the cookie to retrieve.
 * @returns The decoded cookie value if found, otherwise null.
 */
export const getCookieValue = (name: string): string | null => {
  let result = null;
  const cookieArray = document.cookie.split(';');
  cookieArray.forEach((cookie) => {
    const [key, value] = cookie.split('=').map((item) => item.trim());
    if (key === name) {
      result = decodeURIComponent(value);
    }
  });
  return result;
};

/**
 * Sets a cookie with the given name, value, and optional expiration time.
 *
 * @param name - The name of the cookie.
 * @param value - The value of the cookie.
 * @param days - (Optional) Number of days until the cookie expires. If omitted, the cookie is a session cookie.
 */
export const setCookie = (name: string, value: string, days?: number): void => {
  let expires = '';
  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    expires = `; Expires=${date.toUTCString()}`;
  }
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/${expires}`;
};

/**
 * Deletes a cookie by setting its expiration date to a past date.
 *
 * @param name - The name of the cookie to delete.
 */
export const deleteCookie = (name: string): void => {
  document.cookie = `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;`;
};
