import FingerprintJS from '@fingerprintjs/fingerprintjs';

const getUniqueIdentifier = async () => {
  const fp = await FingerprintJS.load();
  const result = await fp.get();

  return result.visitorId;
};

export default getUniqueIdentifier;
