import type { Core } from '@strapi/types';
import * as z from 'zod/v4';

const recipients = z.union([z.string(), z.array(z.string())]);

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
        from: z.string().optional(),
        to: recipients,
        cc: recipients.optional(),
        bcc: recipients.optional(),
        replyTo: z.string().optional(),
        subject: z.string(),
        text: z.string().optional(),
        html: z.string().optional(),
      })
      .catchall(z.unknown())
      .refine((body) => body.text !== undefined || body.html !== undefined, {
        message: 'text or html is required',
      });
  }

  get emailResponse() {
    return z.object({});
  }
}
