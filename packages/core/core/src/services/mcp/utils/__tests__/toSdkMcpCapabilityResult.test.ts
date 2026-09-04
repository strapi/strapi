import type { Modules } from '@strapi/types';
import {
  toSdkContentBlock,
  toSdkPromptResult,
  toSdkResourceListingMetadata,
  toSdkResourceReadResult,
  toSdkToolResult,
} from '../toSdkMcpCapabilityResult';

describe('MCP outbound result translation', () => {
  test('prompt extension metadata and arbitrary fields reach the SDK unchanged', () => {
    const extensionMetadata = { 'vendor.example/trace': { spanId: 'abc' } };
    const extensionField = { anything: ['at', 'all'] };

    const translated = toSdkPromptResult({
      messages: [{ role: 'user', content: { type: 'text', text: 'hello' } }],
      _meta: extensionMetadata,
      'vendor.example/top-level': extensionField,
    });

    expect(translated._meta).toBe(extensionMetadata);
    expect(translated['vendor.example/top-level']).toBe(extensionField);
  });

  test('resource read extension metadata and arbitrary fields reach the SDK unchanged', () => {
    const extensionMetadata = { 'vendor.example/read': 1 };
    const contentsMetadata = { 'vendor.example/checksum': 'deadbeef' };

    const translated = toSdkResourceReadResult({
      contents: [{ uri: 'strapi://app/info', text: 'contents', _meta: contentsMetadata }],
      _meta: extensionMetadata,
      'vendor.example/top-level': 'kept',
    });

    expect(translated._meta).toBe(extensionMetadata);
    expect(translated['vendor.example/top-level']).toBe('kept');
    expect(translated.contents[0]._meta).toBe(contentsMetadata);
  });

  test('content block extension metadata and annotations reach the SDK unchanged', () => {
    const annotations: Modules.MCP.McpContentAnnotations = { audience: ['user'], priority: 0.5 };
    const extensionMetadata = { 'vendor.example/block': true };

    const translated = toSdkContentBlock({
      type: 'image',
      data: 'aGVsbG8=',
      mimeType: 'image/png',
      annotations,
      _meta: extensionMetadata,
    });

    expect(translated).toMatchObject({ type: 'image', data: 'aGVsbG8=', mimeType: 'image/png' });
    expect(translated.annotations).toBe(annotations);
    expect(translated._meta).toBe(extensionMetadata);
  });

  test('listing metadata extension metadata reaches the SDK unchanged', () => {
    const extensionMetadata = { 'vendor.example/listing': 'kept' };

    const translated = toSdkResourceListingMetadata({
      title: 'App info',
      _meta: extensionMetadata,
    });

    expect(translated).toMatchObject({ title: 'App info' });
    expect(translated._meta).toBe(extensionMetadata);
  });

  test('tool branches keep their structured-data and error rules', () => {
    expect(toSdkToolResult({ content: [], structuredContent: { ok: true } })).toMatchObject({
      structuredContent: { ok: true },
    });
    expect(
      toSdkToolResult({ content: [], structuredContent: { ok: true } }).isError
    ).toBeUndefined();

    const errored = toSdkToolResult({
      content: [{ type: 'text', text: 'failed' }],
      isError: true,
    });

    expect(errored.isError).toBe(true);
    expect(errored.structuredContent).toBeUndefined();
  });
});
