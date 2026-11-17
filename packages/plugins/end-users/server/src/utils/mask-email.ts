/**
 * An email address with all but the first letter of its local part hidden, so a notice can name an
 * address without giving it away: `jane.doe@example.com` becomes `j***@example.com`.
 */
export const maskEmail = (email: string): string => {
  const at = email.lastIndexOf('@');

  if (at < 1) {
    return `${email.slice(0, 1)}***`;
  }

  return `${email.slice(0, 1)}***${email.slice(at)}`;
};
