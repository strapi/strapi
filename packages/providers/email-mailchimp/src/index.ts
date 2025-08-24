import MailChimp from '@mailchimp/mailchimp_transactional';

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
  apiKey: string;
}

export default {
  init(providerOptions: ProviderOptions, settings: Settings) {
    const mailchimp = MailChimp(providerOptions.apiKey);

    return {
      send(options: SendOptions): Promise<void> {
        return new Promise((resolve, reject) => {
          const { from, to, cc, bcc, replyTo, subject, text, html, ...rest } = options;

          const recipients: MailChimp.MessageRecipient[] = [];
          if (to) {
            recipients.push({
              email: to,
              type: 'to',
            });
          }
          if (cc) {
            recipients.push({
              email: cc,
              type: 'cc',
            });
          }
          if (bcc) {
            recipients.push({
              email: bcc,
              type: 'bcc',
            });
          }

          const message: MailChimp.MessagesMessage = {
            from_email: from || settings.defaultFrom,
            to: recipients,
            // replyTo: replyTo || settings.defaultReplyTo,
            subject,
            text,
            html,
            ...rest,
          };

          const body: MailChimp.MessagesSendRequest = {
            message,
          }

          mailchimp.messages.send(body).then((response) => {
            //verify if response is  MailChimp.MessagesSendResponse[] or AxiosError<unknown, any>
            if (!Array.isArray(response) || response.length === 0) {
              return reject(new Error('Invalid response from Mailchimp'));
            }
            if (["sent", "queued", "scheduled"].includes(response[0].status)) {
              resolve();
            } else {
              reject(new Error(response[0].reject_reason || 'Failed to send email'));
            }
          }).catch((error) => {
            reject(error);
          });
        });
      },
    };
  },
};
