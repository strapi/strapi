export const utils = {
  bufferToHex(buffer) {
    return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('');
  },
  async digestMessage(message) {
    const msgUint8 = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);

    return this.bufferToHex(hashBuffer);
  },
};

export default async function hashAdminUserEmail(payload) {
  if (!payload) {
    return null;
  }
  try {
    return await utils.digestMessage(payload.email);
  } catch (error) {
    return null;
  }
}
