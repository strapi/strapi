import { resolveMx as dnsResolveMx } from 'dns/promises';
import nodemailer from 'nodemailer';
import type { SentMessageInfo, SendMailOptions } from 'nodemailer';

import {
  collectRecipients,
  extractEmail,
  getHostFromAddress,
  groupRecipientsByDomain,
} from './addressing';
import { createLogger } from './logger';
import type { ProviderSendmailOptions } from './types';

function getEffectiveDevPort(options: ProviderSendmailOptions): number {
  const v = options.devPort;
  if (v === undefined || v === false) {
    return -1;
  }
  if (v === true) {
    return -1;
  }
  return typeof v === 'number' ? v : -1;
}

/**
 * Legacy `sendmail` connects with `createConnection(devPort, devHost)` in dev mode — the
 * dev port is the SMTP port. Otherwise use `smtpPort` (default 25).
 */
function getOutboundSmtpPort(options: ProviderSendmailOptions): number {
  const dev = getEffectiveDevPort(options);
  if (dev !== -1) {
    return dev;
  }
  return options.smtpPort || 25;
}

/**
 * Build list of SMTP peers to try for a recipient domain (MX resolution or dev server),
 * matching guileen/node-sendmail `connectMx` + `smtpHost` append behavior.
 */
export async function resolveMxHosts(
  domain: string,
  options: ProviderSendmailOptions
): Promise<Array<{ exchange: string }>> {
  const devPort = getEffectiveDevPort(options);
  const devHost = options.devHost || 'localhost';

  if (devPort !== -1) {
    return [{ exchange: devHost }];
  }

  let records: Awaited<ReturnType<typeof dnsResolveMx>>;
  try {
    records = await dnsResolveMx(domain);
  } catch (err) {
    const e = err instanceof Error ? err : new Error(String(err));
    throw new Error(`can not resolve Mx of <${domain}>: ${e.message}`);
  }

  if (!records || records.length === 0) {
    throw new Error(`can not resolve Mx of <${domain}>`);
  }

  records.sort((a, b) => a.priority - b.priority);

  const smtpHost = options.smtpHost;
  if (smtpHost !== undefined && smtpHost !== -1 && typeof smtpHost === 'string') {
    records.push({ exchange: smtpHost, priority: 9999 });
  }

  return records.map((r) => ({
    exchange: r.exchange.replace(/\.$/, ''),
  }));
}

async function trySendViaHost(
  exchange: string,
  smtpPort: number,
  srcHost: string,
  fromEnvelope: string,
  recipients: string[],
  mail: SendMailOptions,
  dkim: SendMailOptions['dkim'],
  options: ProviderSendmailOptions
): Promise<SentMessageInfo> {
  const transporter = nodemailer.createTransport({
    host: exchange,
    port: smtpPort,
    secure: false,
    requireTLS: false,
    name: srcHost,
    tls: {
      rejectUnauthorized: options.rejectUnauthorized,
    },
    connectionTimeout: 60_000,
    greetingTimeout: 30_000,
    socketTimeout: 60_000,
    opportunisticTLS: true,
  });

  try {
    return await transporter.sendMail({
      ...mail,
      envelope: {
        from: fromEnvelope,
        to: recipients,
      },
      dkim,
    });
  } finally {
    transporter.close();
  }
}

/**
 * Direct SMTP delivery (per recipient domain, per MX with fallback), replacing the
 * unmaintained `sendmail` npm package while preserving the same routing semantics.
 */
export async function sendDirectSmtp(
  mail: SendMailOptions,
  providerOptions: ProviderSendmailOptions
): Promise<void> {
  const logger = createLogger(providerOptions);
  const smtpPort = getOutboundSmtpPort(providerOptions);

  const fromHeader = String(mail.from || '');
  const fromAddr = extractEmail(fromHeader);
  const srcHost = getHostFromAddress(fromAddr);

  const dkimOpt = providerOptions.dkim;
  const dkim: SendMailOptions['dkim'] =
    dkimOpt && typeof dkimOpt === 'object' && 'privateKey' in dkimOpt
      ? {
          domainName: srcHost,
          keySelector: dkimOpt.keySelector || 'dkim',
          privateKey: dkimOpt.privateKey,
        }
      : undefined;

  const recipients = collectRecipients({
    to: mail.to as string | undefined,
    cc: mail.cc as string | undefined,
    bcc: mail.bcc as string | undefined,
  });

  if (recipients.length === 0) {
    throw new Error('No recipients defined');
  }

  const groups = groupRecipientsByDomain(recipients);
  const fromEnvelope = fromAddr;

  for (const domain of Object.keys(groups)) {
    const domainRecipients = groups[domain];
    let hosts: Array<{ exchange: string }>;
    try {
      hosts = await resolveMxHosts(domain, providerOptions);
    } catch (err) {
      logger.error('Sendmail provider: MX resolution failed', err);
      throw err instanceof Error ? err : new Error(String(err));
    }

    let lastError: Error | undefined;
    let sent = false;

    for (const { exchange } of hosts) {
      try {
        await trySendViaHost(
          exchange,
          smtpPort,
          srcHost,
          fromEnvelope,
          domainRecipients,
          mail,
          dkim,
          providerOptions
        );
        sent = true;
        break;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        logger.error(`Sendmail provider: failed to send via ${exchange}:${smtpPort}`, lastError);
      }
    }

    if (!sent) {
      throw lastError ?? new Error(`Failed to deliver mail for domain ${domain}`);
    }
  }
}
