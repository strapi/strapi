import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';

/** Convert a remote JSON Web Key to the public key used for signature verification. */
const jwkToKeyObject = (jwk: crypto.JsonWebKey) =>
  crypto.createPublicKey({ key: jwk, format: 'jwk' });

/** Verify an RS256 identity token using the matching key in the provider's JWKS. */
const verifyJwtWithJwks = async ({
  idToken,
  jwksUrl,
}: {
  idToken: string;
  jwksUrl: URL;
}): Promise<jwt.JwtPayload> => {
  const decoded = jwt.decode(idToken, { complete: true });
  if (!decoded?.header?.kid || !decoded.payload) throw new Error('The provided token is not valid');
  const response = await fetch(jwksUrl.toString());
  if (!response.ok) throw new Error('There was an error verifying the token');
  const jwk = (await response.json()) as { keys?: (crypto.JsonWebKey & { kid?: string })[] };
  const key = jwk.keys?.find(({ kid }) => kid === decoded.header.kid);
  if (!key) throw new Error('There was an error verifying the token');
  const publicKey = jwkToKeyObject(key);
  return new Promise((resolve, reject) => {
    jwt.verify(idToken, publicKey, { algorithms: ['RS256'] }, (err, tokenPayload) => {
      if (err || typeof tokenPayload !== 'object' || tokenPayload === null) {
        reject(new Error('There was an error verifying the token'));
        return;
      }
      resolve(tokenPayload);
    });
  });
};
export { jwkToKeyObject, verifyJwtWithJwks };
