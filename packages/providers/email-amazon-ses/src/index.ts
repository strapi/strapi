import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

interface Settings {
  defaultFrom: string;
  defaultReplyTo: string;
}

interface SendOptions {
  from?: string;
  to: string;
  cc: string;
  bcc: string;
  replyTo?: string;
  subject: string;
  text: string;
  html: string;
  [key: string]: unknown;
}

interface ProviderOptions {
  key: string;
  secret: string;
  amazon?: string;
}

export default {
  init(providerOptions: ProviderOptions, settings: Settings) {
    const client = new SESClient(providerOptions)

    return {
      send(options: SendOptions): Promise<void> {
        return new Promise((resolve, reject) => {
          const { from, to, cc, bcc, replyTo, subject, text, html, ...rest } = options;

          const command = new SendEmailCommand({
            Source: from || settings.defaultFrom,
            Destination: {
              ToAddresses: [to],
              CcAddresses: [cc],
              BccAddresses: [bcc],
            },
            Message: {
              Subject: {
                Data: subject,
                Charset: "UTF-8",
              },
              Body: {
                Text: {
                  Data: text,
                  Charset: "UTF-8",
                },
                Html: {
                  Data: html,
                  Charset: "UTF-8",
                },
              },
            },
            ReplyToAddresses: [replyTo || settings.defaultReplyTo],
            ...rest
          });

          client.send(command, (err) => {
            if (err) {
              if (err.Message) {
                // eslint-disable-next-line prefer-promise-reject-errors
                reject(`${err.Message} ${err.Detail ? err.Detail : ''}`);
              }
              reject(err);
            } else {
              resolve();
            }
          });
        });
      },
    };
  },
};
