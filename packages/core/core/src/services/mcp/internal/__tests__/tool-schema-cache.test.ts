import {
  MCP_TOOL_JSON_SCHEMA_CACHE_MAX_BYTES,
  McpToolJsonSchemaCache,
  mcpToolSchemaCache,
  mcpToolSchemaCacheKey,
} from '../tool-schema-cache';

const schema = (label: string, pad = ''): { output: Record<string, unknown> } => ({
  output: { type: 'object', label, pad },
});

const delay = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

describe('mcp tool JSON schema cache', () => {
  test('uses a 32MB byte cap on the process cache', () => {
    expect(mcpToolSchemaCache.maxBytes).toBe(MCP_TOOL_JSON_SCHEMA_CACHE_MAX_BYTES);
    expect(MCP_TOOL_JSON_SCHEMA_CACHE_MAX_BYTES).toBe(32 * 1024 * 1024);
  });

  test('sorts field and locale names into the key', () => {
    expect(
      mcpToolSchemaCacheKey('list_article', {
        fieldSets: [['count', 'title']],
        localeSets: [['fr', 'en']],
      })
    ).toBe(
      mcpToolSchemaCacheKey('list_article', {
        fieldSets: [['title', 'count']],
        localeSets: [['en', 'fr']],
      })
    );
    expect(
      mcpToolSchemaCacheKey('list_article', {
        fieldSets: [['title']],
        localeSets: [['en']],
      })
    ).not.toBe(
      mcpToolSchemaCacheKey('list_article', {
        fieldSets: [['count']],
        localeSets: [['en']],
      })
    );
  });

  test('returns a copy and does not rebuild on a hit', async () => {
    const cache = new McpToolJsonSchemaCache();
    let builds = 0;
    const build = () => {
      builds += 1;
      return schema('title');
    };

    const first = await cache.getOrBuild('list_article', build);
    first.output.label = 'mutated';
    const second = await cache.getOrBuild('list_article', build);

    expect(builds).toBe(1);
    expect(second.output.label).toBe('title');
    expect(second.output).not.toBe(first.output);
    expect(JSON.parse(JSON.stringify(second.output))).toEqual(second.output);
  });

  test('shares one build for concurrent readers of the same key', async () => {
    const cache = new McpToolJsonSchemaCache();
    let builds = 0;
    const build = async () => {
      builds += 1;
      await delay(20);
      return schema('shared');
    };

    const [left, right] = await Promise.all([
      cache.getOrBuild('same', build),
      cache.getOrBuild('same', build),
    ]);

    expect(builds).toBe(1);
    expect(left.output).toEqual(right.output);
    expect(left.output).not.toBe(right.output);
  });

  test('materializes one schema at a time across different keys', async () => {
    const cache = new McpToolJsonSchemaCache();
    let active = 0;
    let maxActive = 0;

    const build = (label: string) => async () => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await delay(20);
      active -= 1;
      return schema(label);
    };

    await Promise.all([
      cache.getOrBuild('a', build('a')),
      cache.getOrBuild('b', build('b')),
      cache.getOrBuild('a', build('a-again')),
    ]);

    expect(maxActive).toBe(1);
    expect(cache.size).toBe(2);
  });

  test('does not store a failed build', async () => {
    const cache = new McpToolJsonSchemaCache();
    const builds = { count: 0 };

    await expect(
      cache.getOrBuild('broken', async () => {
        builds.count += 1;
        throw new Error('schema resolution failed');
      })
    ).rejects.toThrow('schema resolution failed');
    expect(cache.size).toBe(0);

    await cache.getOrBuild('broken', () => {
      builds.count += 1;
      return schema('recovered');
    });

    expect(builds.count).toBe(2);
    expect(cache.size).toBe(1);
  });

  test('stays within the byte cap and rebuilds after eviction', async () => {
    const cache = new McpToolJsonSchemaCache(180);
    const builds = { wide: 0, other: 0 };
    const wide = () => {
      builds.wide += 1;
      return schema('wide', 'x'.repeat(40));
    };
    const other = () => {
      builds.other += 1;
      return schema('other', 'y'.repeat(40));
    };

    await cache.getOrBuild('wide', wide);
    await cache.getOrBuild('other', other);

    expect(cache.byteLength).toBeLessThanOrEqual(180);
    expect(cache.size).toBe(1);

    await cache.getOrBuild('wide', wide);
    expect(builds.wide).toBe(2);
    expect(cache.byteLength).toBeLessThanOrEqual(180);
  });

  test('does not store a schema larger than the cap', async () => {
    const cache = new McpToolJsonSchemaCache(50);
    let builds = 0;
    const build = () => {
      builds += 1;
      return schema('huge', 'z'.repeat(80));
    };

    const listed = await cache.getOrBuild('huge', build);
    expect(listed.output.label).toBe('huge');
    expect(cache.size).toBe(0);

    await cache.getOrBuild('huge', build);
    expect(builds).toBe(2);
  });
});
