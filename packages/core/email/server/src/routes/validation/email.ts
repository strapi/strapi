import type { Core } from '@strapi/types';
import * as z from 'zod/v4';

export class EmailRouteValidator {
  protected readonly _strapi: Core.Strapi;

  public constructor(strapi: Core.Strapi) {
    this._strapi = strapi;
  }

  /**
   * OpenAPI description of the documented `send` fields. Additional keys are provider options
   * (attachments, headers, template data…).
   * The `send` handler does not validate against it: it rejects only a non-object body and
   * passes every field to the provider unchanged.
   */
  get sendEmailInput() {
    return z
      .object({
        from: z.string().optional(),
        to: z.string(),
        cc: z.string().optional(),
        bcc: z.string().optional(),
        replyTo: z.string().optional(),
        subject: z.string(),
        text: z.string(),
        html: z.string().optional(),
      })
      .catchall(z.unknown());
  }

  get emailResponse() {
    return z.object({});
  }
}
