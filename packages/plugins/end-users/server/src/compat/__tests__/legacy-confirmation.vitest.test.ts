import { describe, expect, it } from 'vitest';
import type { Core } from '@strapi/types';

import { confirmLegacyToken, isLegacyConfirmationToken } from '../legacy-confirmation';

// Built at run time: a secret-shaped literal does not belong in a test file
const hex = (char: string, length = 40) => char.repeat(length);

const setup = (row: { id: number; documentId: string; emailVerified: boolean; token: string }) => {
  const state = { ...row, token: row.token as string | null };
  const locked: string[] = [];
  const strapi = {
    db: {
      transaction: async (work: () => Promise<unknown>) => work(),
      queryBuilder() {
        let wanted: string | undefined;
        const builder = {
          select: () => builder,
          where(where: { confirmationToken: string }) {
            wanted = where.confirmationToken;
            return builder;
          },
          first: () => builder,
          forUpdate() {
            locked.push(String(wanted));
            return builder;
          },
          async execute() {
            return state.token !== null && state.token === wanted
              ? { id: state.id, documentId: state.documentId, emailVerified: state.emailVerified }
              : null;
          },
        };

        return builder;
      },
      query: () => ({
        async update({ data }: { data: { emailVerified: boolean; confirmationToken: null } }) {
          state.emailVerified = data.emailVerified;
          state.token = data.confirmationToken;
        },
      }),
    },
  } as unknown as Core.Strapi;

  return { strapi, state, locked };
};

describe('legacy confirmation', () => {
  it('recognizes a forty-character lowercase hex token and nothing else', () => {
    expect(isLegacyConfirmationToken(hex('a'))).toBe(true);
    expect(isLegacyConfirmationToken(hex('0f', 20))).toBe(true);
    expect(isLegacyConfirmationToken(hex('a', 39))).toBe(false);
    expect(isLegacyConfirmationToken(hex('a', 41))).toBe(false);
    expect(isLegacyConfirmationToken(hex('A'))).toBe(false);
    expect(isLegacyConfirmationToken(hex('g'))).toBe(false);
    expect(isLegacyConfirmationToken('a.b.c')).toBe(false);
  });

  it('confirms once and clears the token, and a second call finds nothing', async () => {
    const token = hex('c');
    const { strapi, state, locked } = setup({
      id: 7,
      documentId: 'doc7',
      emailVerified: false,
      token,
    });

    await expect(confirmLegacyToken(strapi, token)).resolves.toEqual({
      documentId: 'doc7',
      confirmedNow: true,
    });
    expect(state).toMatchObject({ emailVerified: true, token: null });
    expect(locked).toEqual([token]);

    await expect(confirmLegacyToken(strapi, token)).resolves.toBeNull();
  });

  it('says it did not confirm now when the address was already confirmed', async () => {
    const token = hex('d');
    const { strapi } = setup({ id: 1, documentId: 'doc1', emailVerified: true, token });

    await expect(confirmLegacyToken(strapi, token)).resolves.toEqual({
      documentId: 'doc1',
      confirmedNow: false,
    });
  });
});
