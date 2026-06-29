'use strict';

const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const jwkToKeyObject = (jwk) => crypto.createPublicKey({ key: jwk, format: 'jwk' });

const verifyJwtWithJwks = async ({ idToken, jwksUrl }) => {
  const decoded = jwt.decode(idToken, { complete: true });

  if (!decoded?.header?.kid || !decoded.payload) {
    throw new Error('The provided token is not valid');
  }

  const response = await fetch(jwksUrl.toString());
  if (!response.ok) {
    throw new Error('There was an error verifying the token');
  }

  const jwk = await response.json();
  const key = jwk.keys?.find(({ kid }) => kid === decoded.header.kid);

  if (!key) {
    throw new Error('There was an error verifying the token');
  }

  const publicKey = jwkToKeyObject(key);

  return new Promise((resolve, reject) => {
    jwt.verify(idToken, publicKey, { algorithms: ['RS256'] }, (err, tokenPayload) => {
      if (err) {
        reject(new Error('There was an error verifying the token'));
        return;
      }
      resolve(tokenPayload);
    });
  });
};

module.exports = {
  jwkToKeyObject,
  verifyJwtWithJwks,
};
