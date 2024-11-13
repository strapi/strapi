export const getCookieValue = (name: string) => {
  let result = null;
  const cookieArray = document.cookie.split(';');
  cookieArray.forEach((cookie) => {
    const [key, value] = cookie.split('=').map((item) => item.trim());
    if (key.trim() === name) {
      result = decodeURIComponent(value);
    }
  });
  return result;
};

export const deleteCookie = (name: string) => {
  // Set the cookie to expire in the past
  document.cookie = name + '=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
};
