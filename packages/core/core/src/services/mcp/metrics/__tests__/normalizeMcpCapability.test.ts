import { normalizeMcpCapability } from '../normalizeMcpCapability';

describe('normalizeMcpCapability', () => {
  it('falls back to unknown source and raw name when no telemetry is provided', () => {
    expect(normalizeMcpCapability('tool', 'create_article')).toEqual({
      type: 'tool',
      source: 'unknown',
      name: 'create_article',
    });
  });

  it('resolves content-manager source and sanitized name from telemetry', () => {
    expect(
      normalizeMcpCapability('tool', 'create_article', {
        source: 'content-manager',
        name: 'create',
      })
    ).toEqual({
      type: 'tool',
      source: 'content-manager',
      name: 'create',
    });
  });

  it('passes through any non-empty source string as-is (plugin case)', () => {
    expect(normalizeMcpCapability('tool', 'some_plugin_tool', { source: 'my-plugin' })).toEqual({
      type: 'tool',
      source: 'my-plugin',
      name: 'some_plugin_tool',
    });
  });

  it('uses raw name when telemetry provides source but no name override', () => {
    expect(normalizeMcpCapability('tool', 'log', { source: 'unknown' })).toEqual({
      type: 'tool',
      source: 'unknown',
      name: 'log',
    });
  });

  it('falls back to unknown source when telemetry is provided without source', () => {
    expect(normalizeMcpCapability('tool', 'custom_plugin_tool', { name: 'custom' })).toEqual({
      type: 'tool',
      source: 'unknown',
      name: 'custom',
    });
  });

  it('tracks prompts and resources with unknown source fallback', () => {
    expect(normalizeMcpCapability('prompt', 'summarize_entry')).toEqual({
      type: 'prompt',
      source: 'unknown',
      name: 'summarize_entry',
    });
    expect(normalizeMcpCapability('resource', 'project://readme')).toEqual({
      type: 'resource',
      source: 'unknown',
      name: 'project://readme',
    });
  });
});
