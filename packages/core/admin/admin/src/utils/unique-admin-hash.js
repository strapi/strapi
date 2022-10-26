function bufferToHex(buffer) {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function digestMessage(message) {
  const msgUint8 = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);

  return bufferToHex(hashBuffer);
}

export default async function hashAdminUserEmail(payload) {
  try {
    return await digestMessage(payload.email);
  } catch (error) {
    // not a secure context
    const hash = await import('hash.js');

    return hash.sha256().update(payload.email).digest('hex');
  }
}
