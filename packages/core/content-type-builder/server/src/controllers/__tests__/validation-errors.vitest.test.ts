import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Context } from 'koa';

import * as builder from '../../services/builder';
import contentTypes from '../content-types';
import components from '../components';

const createContext = ({ params = {}, body }: { params?: object; body: unknown }) => {
  const send = vi.fn();

  return {
    ctx: { params, query: {}, request: { body }, send } as unknown as Context,
    send,
  };
};

// The response body as the client receives it
const getSentBody = (send: ReturnType<typeof vi.fn>) =>
  JSON.parse(JSON.stringify(send.mock.calls[0][0]));

describe('CTB controllers - validation errors', () => {
  beforeEach(() => {
    global.strapi = {
      contentTypes: {
        'api::article.article': { kind: 'collectionType', attributes: {} },
      },
      components: {
        'shared.quote': { attributes: {} },
      },
      plugin: () => ({ service: () => builder }),
      reload: vi.fn(),
    } as any;
  });

  it('keeps the message when content type creation validation throws a native error', async () => {
    const { ctx, send } = createContext({ body: {} });

    await contentTypes.createContentType(ctx);

    expect(send).toHaveBeenCalledWith(expect.anything(), 400);
    expect(getSentBody(send)).toEqual({
      error: {
        name: 'TypeError',
        message: expect.stringContaining('singularName'),
        details: {},
      },
    });
  });

  it('keeps the message when content type update validation throws a native error', async () => {
    const { ctx, send } = createContext({
      params: { uid: 'api::article.article' },
      body: { contentType: { kind: 'collectionType' } },
    });

    await contentTypes.updateContentType(ctx);

    expect(send).toHaveBeenCalledWith(expect.anything(), 400);
    expect(getSentBody(send)).toEqual({
      error: {
        name: 'TypeError',
        message: expect.stringContaining('undefined'),
        details: {},
      },
    });
  });

  it('keeps the message when component update validation throws a native error', async () => {
    const { ctx, send } = createContext({
      params: { uid: 'shared.quote' },
      body: { component: { category: '' } },
    });

    await components.updateComponent(ctx);

    expect(send).toHaveBeenCalledWith(expect.anything(), 400);
    expect(getSentBody(send)).toEqual({
      error: {
        name: 'TypeError',
        message: expect.stringContaining('undefined'),
        details: {},
      },
    });
  });

  it('keeps the Yup validation error body unchanged', async () => {
    const { ctx, send } = createContext({ body: { component: {} } });

    await components.createComponent(ctx);

    expect(send).toHaveBeenCalledWith(expect.anything(), 400);
    expect(getSentBody(send)).toEqual({
      error: {
        name: 'ValidationError',
        message: '3 errors occurred',
        details: {
          errors: [
            {
              path: ['component', 'attributes'],
              message: 'attributes.required',
              name: 'ValidationError',
            },
            {
              path: ['component', 'displayName'],
              message: 'displayName.required',
              name: 'ValidationError',
            },
            {
              path: ['component', 'category'],
              message: 'category.required',
              name: 'ValidationError',
            },
          ],
        },
      },
    });
  });
});
