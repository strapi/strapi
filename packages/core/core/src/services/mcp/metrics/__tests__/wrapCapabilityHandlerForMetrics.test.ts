import { sendDidExecuteMcpCapability, sendDidNotExecuteMcpCapability } from '../metrics';
import { wrapCapabilityHandlerForMetrics } from '../wrapCapabilityHandlerForMetrics';

jest.mock('../metrics', () => ({
  sendDidExecuteMcpCapability: jest.fn(),
  sendDidNotExecuteMcpCapability: jest.fn(),
}));

describe('wrapCapabilityHandlerForMetrics', () => {
  beforeEach(() => {
    jest.mocked(sendDidExecuteMcpCapability).mockClear();
    jest.mocked(sendDidNotExecuteMcpCapability).mockClear();
  });

  test('records metrics with content-manager source when telemetry is provided', async () => {
    const strapi = { telemetry: { send: jest.fn() } } as any;
    const handler = jest.fn().mockResolvedValue({ content: [{ type: 'text', text: 'ok' }] });

    const wrapped = wrapCapabilityHandlerForMetrics(
      strapi,
      'tool',
      'create_article',
      { source: 'content-manager', name: 'create' },
      handler
    );
    await wrapped({ args: {} });

    expect(sendDidExecuteMcpCapability).toHaveBeenCalledWith(strapi, {
      type: 'tool',
      source: 'content-manager',
      name: 'create',
    });
    expect(sendDidNotExecuteMcpCapability).not.toHaveBeenCalled();
  });

  test('falls back to unknown source and raw name when telemetry is undefined', async () => {
    const strapi = { telemetry: { send: jest.fn() } } as any;
    const handler = jest.fn().mockResolvedValue({ content: [{ type: 'text', text: 'ok' }] });

    const wrapped = wrapCapabilityHandlerForMetrics(strapi, 'tool', 'log', undefined, handler);
    await wrapped({ args: {} });

    expect(sendDidExecuteMcpCapability).toHaveBeenCalledWith(strapi, {
      type: 'tool',
      source: 'unknown',
      name: 'log',
    });
    expect(sendDidNotExecuteMcpCapability).not.toHaveBeenCalled();
  });

  test('records failure metrics when the handler returns an error result', async () => {
    const strapi = { telemetry: { send: jest.fn() } } as any;
    const handler = jest.fn().mockResolvedValue({
      content: [{ type: 'text', text: 'failed' }],
      isError: true,
    });

    const wrapped = wrapCapabilityHandlerForMetrics(
      strapi,
      'tool',
      'create_article',
      { source: 'content-manager', name: 'create' },
      handler
    );
    await wrapped({ args: {} });

    expect(sendDidNotExecuteMcpCapability).toHaveBeenCalledWith(
      strapi,
      { type: 'tool', source: 'content-manager', name: 'create' },
      'execution_error'
    );
    expect(sendDidExecuteMcpCapability).not.toHaveBeenCalled();
  });

  test('records plugin source when telemetry provides only a source string', async () => {
    const strapi = { telemetry: { send: jest.fn() } } as any;
    const handler = jest.fn().mockResolvedValue({ content: [{ type: 'text', text: 'ok' }] });

    const wrapped = wrapCapabilityHandlerForMetrics(
      strapi,
      'tool',
      'some_plugin_tool',
      { source: 'my-plugin' },
      handler
    );
    await wrapped({ args: {} });

    expect(sendDidExecuteMcpCapability).toHaveBeenCalledWith(strapi, {
      type: 'tool',
      source: 'my-plugin',
      name: 'some_plugin_tool',
    });
  });
});
