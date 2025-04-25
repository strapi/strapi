import type { OpenAPIV3 } from 'openapi-types';
import { RegistriesFactory } from '../../registries';

import type { DocumentContext, DocumentContextData } from '../../types';
import { TimerFactory } from '../../utils';
import type { PartialContext } from '../types';

import { AbstractContextFactory } from './abstract';

export class DocumentContextFactory extends AbstractContextFactory<Partial<OpenAPIV3.Document>> {
  constructor(
    registriesFactory: RegistriesFactory = new RegistriesFactory(),
    timerFactory: TimerFactory = new TimerFactory()
  ) {
    super(registriesFactory, timerFactory);
  }

  create(context: PartialContext<DocumentContextData>): DocumentContext {
    return super.create(context, {});
  }
}
