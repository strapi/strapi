import { resolveMx } from 'dns/promises';

import { resolveMxHosts, sendDirectSmtp } from '../src/direct-smtp';

jest.mock('dns/promises', () => ({
  resolveMx: jest.fn(),
}));

const mockedResolveMx = resolveMx as jest.MockedFunction<typeof resolveMx>;

describe('resolveMxHosts', () => {
  beforeEach(() => {
    mockedResolveMx.mockReset();
  });

  it('uses devHost when devPort is set (development / capture mode)', async () => {
    const hosts = await resolveMxHosts('example.com', {
      devPort: 1025,
      devHost: '127.0.0.1',
    });
    expect(hosts).toEqual([{ exchange: '127.0.0.1' }]);
    expect(mockedResolveMx).not.toHaveBeenCalled();
  });

  it('defaults devHost to localhost when devPort is set', async () => {
    const hosts = await resolveMxHosts('example.com', { devPort: 1025 });
    expect(hosts).toEqual([{ exchange: 'localhost' }]);
  });

  it('resolves MX records sorted by priority (lower number = higher preference)', async () => {
    mockedResolveMx.mockResolvedValueOnce([
      { exchange: 'mx20.example.com.', priority: 20 },
      { exchange: 'mx10.example.com.', priority: 10 },
    ]);

    const hosts = await resolveMxHosts('example.com', {});
    expect(mockedResolveMx).toHaveBeenCalledWith('example.com');
    expect(hosts.map((h) => h.exchange)).toEqual(['mx10.example.com', 'mx20.example.com']);
  });

  it('strips trailing dot from MX exchange', async () => {
    mockedResolveMx.mockResolvedValueOnce([{ exchange: 'mx.example.com.', priority: 0 }]);

    const hosts = await resolveMxHosts('example.com', {});
    expect(hosts).toEqual([{ exchange: 'mx.example.com' }]);
  });

  it('appends smtpHost when set to a string (legacy sendmail behavior)', async () => {
    mockedResolveMx.mockResolvedValueOnce([{ exchange: 'mx.example.com', priority: 0 }]);

    const hosts = await resolveMxHosts('example.com', { smtpHost: 'relay.extra.com' });
    expect(hosts.map((h) => h.exchange)).toEqual(['mx.example.com', 'relay.extra.com']);
  });

  it('throws when MX resolution returns empty', async () => {
    mockedResolveMx.mockResolvedValueOnce([]);

    await expect(resolveMxHosts('example.com', {})).rejects.toThrow('can not resolve Mx');
  });

  it('wraps dns errors with context', async () => {
    mockedResolveMx.mockRejectedValueOnce(new Error('ENOTFOUND'));

    await expect(resolveMxHosts('example.com', {})).rejects.toThrow('can not resolve Mx');
  });
});

describe('sendDirectSmtp', () => {
  const baseMail = {
    from: 'Sender <sender@from.com>',
    to: 'user@to.com',
    subject: 'Hello',
    text: 'Body',
    html: '<p>Body</p>',
  };

  it('rejects when there are no recipients', async () => {
    await expect(sendDirectSmtp({ ...baseMail, to: '', cc: '', bcc: '' }, {})).rejects.toThrow(
      'No recipients defined'
    );
  });
});
