import type { DocumentContext } from '../../types';

import { createDebugger } from '../../utils';

import type { Assembler } from '..';

const debug = createDebugger('assembler:metadata');

export class DocumentMetadataAssembler implements Assembler.Document {
  assemble(context: DocumentContext): void {
    const { strapi } = context;

    const strapiVersion = strapi.config.get<string>('info.strapi');

    debug(`assembling document's metadata for %O...`, { strapiVersion });

    const metadata = new Map<string, unknown>()
      .set('openapi', '3.1.0')
      .set('x-powered-by', 'strapi')
      .set('x-strapi-version', strapiVersion);

    const metadataObject = Object.fromEntries(metadata);

    debug(`document's metadata assembled: %O`, metadataObject);

    Object.assign(context.output.data, metadataObject);
  }
}
