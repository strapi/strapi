import { resolveMx } from 'dns/promises';
import nodemailer from 'nodemailer';

import { sendDirectSmtp } from '../src/direct-smtp';

jest.mock('dns/promises', () => ({
  resolveMx: jest.fn(),
}));

jest.mock('nodemailer');

const mockedResolveMx = resolveMx as jest.MockedFunction<typeof resolveMx>;
const mockedCreateTransport = nodemailer.createTransport as jest.MockedFunction<
  typeof nodemailer.createTransport
>;

describe('sendDirectSmtp MX fallback and transport options', () => {
  const sendMail = jest.fn();
  const close = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    sendMail.mockResolvedValue({ messageId: '<id@test>' });
    close.mockImplementation(() => {});
    mockedCreateTransport.mockReturnValue({ sendMail, close } as unknown as ReturnType<
      typeof nodemailer.createTransport
    >);
  });

  it('passes tls.rejectUnauthorized to createTransport', async () => {
    await sendDirectSmtp(
      { from: 'a@b.com', to: 'c@b.com', subject: 's', text: 't' },
      {
        devPort: 1025,
        devHost: '127.0.0.1',
        rejectUnauthorized: false,
      }
    );

    expect(mockedCreateTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        ignoreTLS: true,
        tls: { rejectUnauthorized: false },
      })
    );
  });

  it('retries the next MX host when the first connection fails', async () => {
    mockedResolveMx.mockResolvedValue([
      { exchange: 'mx1.bad.example', priority: 10 },
      { exchange: 'mx2.good.example', priority: 20 },
    ]);

    sendMail.mockRejectedValueOnce(new Error('ECONNREFUSED')).mockResolvedValueOnce({
      messageId: '<ok@test>',
    });

    await sendDirectSmtp(
      { from: 'from@src.com', to: 'to@dst.com', subject: 's', text: 't' },
      { smtpPort: 25, silent: true }
    );

    expect(mockedCreateTransport).toHaveBeenCalledTimes(2);
    expect(mockedCreateTransport.mock.calls[0][0]).toMatchObject({ host: 'mx1.bad.example' });
    expect(mockedCreateTransport.mock.calls[1][0]).toMatchObject({ host: 'mx2.good.example' });
    expect(sendMail).toHaveBeenCalledTimes(2);
  });

  it('does not fail the whole send when at least one recipient domain succeeds', async () => {
    mockedResolveMx.mockImplementation(async (domain: string) => {
      if (domain === 'bad.example') {
        return [{ exchange: 'mx.bad.example', priority: 10 }];
      }

      if (domain === 'good.example') {
        return [{ exchange: 'mx.good.example', priority: 10 }];
      }

      throw new Error(`unexpected domain ${domain}`);
    });

    mockedCreateTransport.mockImplementation((transport) => {
      const host =
        transport && typeof transport === 'object' && 'host' in transport
          ? String((transport as { host?: unknown }).host ?? '')
          : '';
      const perHostSend = jest.fn();
      if (host === 'mx.bad.example') {
        perHostSend.mockRejectedValue(new Error('ECONNREFUSED'));
      } else {
        perHostSend.mockResolvedValue({ messageId: '<ok@test>' });
      }

      return { sendMail: perHostSend, close } as unknown as ReturnType<
        typeof nodemailer.createTransport
      >;
    });

    await expect(
      sendDirectSmtp(
        {
          from: 'from@src.com',
          to: 'bad@bad.example, ok@good.example',
          subject: 's',
          text: 't',
        },
        { smtpPort: 25, silent: true }
      )
    ).resolves.toBeUndefined();
  });
});
