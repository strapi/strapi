import type { OpenAPIV3_1 } from 'openapi-types';

import type { DocumentContext } from '../../types';

import { createDebugger } from '../../utils';

import type { Assembler } from '..';

interface StrapiInfoConfig {
  name: string;
  version: string;
}

const debug = createDebugger('assembler:info');

export class DocumentInfoAssembler implements Assembler.Document {
  assemble(context: DocumentContext): void {
    const { name, version } = context.strapi.config.get<StrapiInfoConfig>('info');

    debug(`assembling document's info for %O...`, { name, version });

    const info: OpenAPIV3_1.InfoObject = {
      title: this._title(name),
      description: this._description(name, version),
      version,
    };

    debug(`document's info assembled: %O`, info);

    context.output.data.info = info;
  }

  private _title(name: string) {
    return `${name}`;
  }

  private _description(name: string, version: string) {
    return `API documentation for ${name} v${version}`;
  }
}
