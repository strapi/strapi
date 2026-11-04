import type { Core } from '@strapi/types';
import * as z from 'zod/v4';

// A recipient is an address string or an address object, as nodemailer and SendGrid accept.
// Other keys of the object pass through to the provider.
const address = z
  .object({ name: z.string().optional(), address: z.string() })
  .catchall(z.unknown());

const recipient = z.union([z.string(), address]);

// Flat union (rather than `[recipient, z.array(recipient)]`) keeps the OpenAPI output readable
const recipients = z.union([z.string(), address, z.array(recipient)]);

export class EmailRouteValidator {
  protected readonly _strapi: Core.Strapi;

  public constructor(strapi: Core.Strapi) {
    this._strapi = strapi;
  }

  /**
   * Request body of the `send` handler, served by both the content API and the admin route.
   * Additional keys are provider options (attachments, headers, template data…) passed as is.
   */
  get sendEmailInput() {
    return z
      .object({
        from: recipient.nullish(),
        to: recipients,
        cc: recipients.nullish(),
        bcc: recipients.nullish(),
        replyTo: recipients.nullish(),
        // `subject`, `text` and `html` are optional: template sends (SendGrid `templateId`,
        // Mailgun `template`, nodemailer `raw`) carry none of them. The provider rejects
        // a mail it cannot build.
        subject: z.string().nullish(),
        text: z.string().nullish(),
        html: z.string().nullish(),
      })
      .catchall(z.unknown());
  }

  get emailResponse() {
    return z.object({});
  }
}
