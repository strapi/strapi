'use strict';

import crypto from 'node:crypto';
import { isoBase64URL, isoCBOR } from '@simplewebauthn/server/helpers';

/**
 * A software WebAuthn authenticator: an ES256 key pair that answers registration and
 * authentication options with real attestation and assertion responses, so the server's
 * verification runs against real cryptography rather than a mocked `@simplewebauthn/server`.
 *
 * `none` attestation, the same as a platform authenticator under the default `attestationType`.
 * The user-presence and user-verification flags are always set; an override exists for each part
 * of the response a test needs to tamper with.
 */
export const createSoftwareAuthenticator = ({ rpId, origin }: { rpId: string; origin: string }) => {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const jwk = publicKey.export({ format: 'jwk' }) as { x: string; y: string };
  const credentialId = crypto.randomBytes(32);
  const credentialIdB64 = isoBase64URL.fromBuffer(credentialId);
  let signCount = 0;

  const sha256 = (data: Uint8Array | string) =>
    new Uint8Array(crypto.createHash('sha256').update(data).digest());

  const uint32 = (value: number) => {
    const out = Buffer.alloc(4);
    out.writeUInt32BE(value);
    return new Uint8Array(out);
  };

  const concat = (...parts: Uint8Array[]) => new Uint8Array(Buffer.concat(parts));

  const FLAG_UP = 0x01;
  const FLAG_UV = 0x04;
  const FLAG_AT = 0x40;

  const cosePublicKey = () =>
    isoCBOR.encode(
      new Map<number, number | Uint8Array>([
        [1, 2], // kty: EC2
        [3, -7], // alg: ES256
        [-1, 1], // crv: P-256
        [-2, isoBase64URL.toBuffer(jwk.x)],
        [-3, isoBase64URL.toBuffer(jwk.y)],
      ])
    );

  const clientData = (type: string, challenge: string, overrideOrigin?: string) =>
    new TextEncoder().encode(
      JSON.stringify({ type, challenge, origin: overrideOrigin ?? origin, crossOrigin: false })
    );

  return {
    credentialId: credentialIdB64,

    /** Answers `generateRegistrationOptions` output. */
    register(options: { challenge: string }) {
      const authData = concat(
        sha256(rpId),
        new Uint8Array([FLAG_UP | FLAG_UV | FLAG_AT]),
        uint32(signCount),
        new Uint8Array(16), // AAGUID
        new Uint8Array([credentialId.length >> 8, credentialId.length & 0xff]),
        new Uint8Array(credentialId),
        cosePublicKey()
      );

      const attestationObject = isoCBOR.encode(
        new Map<string, unknown>([
          ['fmt', 'none'],
          ['attStmt', new Map()],
          ['authData', authData],
        ])
      );

      return {
        id: credentialIdB64,
        rawId: credentialIdB64,
        type: 'public-key' as const,
        response: {
          clientDataJSON: isoBase64URL.fromBuffer(clientData('webauthn.create', options.challenge)),
          attestationObject: isoBase64URL.fromBuffer(attestationObject),
          transports: ['internal'],
        },
        clientExtensionResults: {},
        authenticatorAttachment: 'platform' as const,
      };
    },

    /**
     * Answers `generateAuthenticationOptions` output. Each call advances the signature counter,
     * as a real authenticator does, unless `counter` pins it.
     */
    authenticate(
      options: { challenge: string },
      overrides: { counter?: number; origin?: string; rpId?: string } = {}
    ) {
      signCount = overrides.counter ?? signCount + 1;

      const authenticatorData = concat(
        sha256(overrides.rpId ?? rpId),
        new Uint8Array([FLAG_UP | FLAG_UV]),
        uint32(signCount)
      );
      const clientDataJSON = clientData('webauthn.get', options.challenge, overrides.origin);
      const signature = crypto.sign(
        'sha256',
        Buffer.from(concat(authenticatorData, sha256(clientDataJSON))),
        privateKey
      );

      return {
        id: credentialIdB64,
        rawId: credentialIdB64,
        type: 'public-key' as const,
        response: {
          clientDataJSON: isoBase64URL.fromBuffer(clientDataJSON),
          authenticatorData: isoBase64URL.fromBuffer(authenticatorData),
          signature: isoBase64URL.fromBuffer(new Uint8Array(signature)),
        },
        clientExtensionResults: {},
        authenticatorAttachment: 'platform' as const,
      };
    },
  };
};
