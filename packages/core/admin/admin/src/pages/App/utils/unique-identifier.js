import FingerprintJS from '@fingerprintjs/fingerprintjs';

const getUniqueIdentifier = async () => {
  const fp = await FingerprintJS.load();
  const result = await fp.get();

  const deviceId = `web-fingerprint-${result.visitorId}`;

  return deviceId;
};

export default getUniqueIdentifier;
