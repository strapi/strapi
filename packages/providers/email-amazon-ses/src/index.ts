import { SESClient, SendEmailCommand, SESClientConfig } from "@aws-sdk/client-ses";

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

export default {
  init(providerOptions: SESClientConfig, settings: Settings) {
    const client = new SESClient(providerOptions);
    
    return {
      send(options: SendOptions): Promise<void> {
        return new Promise((resolve, reject) => {
          const { from, to, cc, bcc, replyTo, subject, text, html } = options;

          const msg = { // SendEmailRequest
            Source: from || settings.defaultFrom,
            Destination: {
              ToAddresses: [to],
              ...cc ? { CcAddresses: [cc] } : { },
              ...bcc ? { BccAddresses: [bcc] } : {}

            },
            Message: {
              Subject: {
                Data: subject
              },
              Body: { 
                Text: {
                  Data: text
                },
                Html: {
                  Data: html
                },
              },
            },
            ReplyToAddresses: [
              replyTo || settings.defaultReplyTo,
            ],
            ReturnPath: settings.defaultFrom 
          };
          const command = new SendEmailCommand(msg);        
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
