import type { User } from '../features/Auth';

/* -------------------------------------------------------------------------------------------------
 * getDisplayName
 * -----------------------------------------------------------------------------------------------*/

/**
 * Retrieves the display name of an admin panel user
 */
const getDisplayName = ({ firstname, lastname, username, email }: Partial<User> = {}): string => {
  if (username) {
    return username;
  }

  // firstname is not required if the user is created with a username
  if (firstname) {
    return `${firstname} ${lastname ?? ''}`.trim();
  }

  return email ?? '';
};

/* -------------------------------------------------------------------------------------------------
 * hashAdminUserEmail
 * -----------------------------------------------------------------------------------------------*/

const hashAdminUserEmail = async (payload?: User) => {
  if (!payload || !payload.email) {
    return null;
  }

  try {
    return await digestMessage(payload.email);
  } catch (error) {
    return null;
  }
};

const bufferToHex = (buffer: ArrayBuffer) => {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('');
};
const digestMessage = async (message: string) => {
  const msgUint8 = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);

  return bufferToHex(hashBuffer);
};

export { getDisplayName, hashAdminUserEmail };
