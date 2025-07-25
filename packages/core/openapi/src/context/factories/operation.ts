import type { OpenAPIV3_1 } from 'openapi-types';

import { RegistriesFactory } from '../../registries';

import type { OperationContext, OperationContextData } from '../../types';
import { TimerFactory } from '../../utils';

import type { PartialContext } from '../types';

import { AbstractContextFactory } from './abstract';

export class OperationContextFactory extends AbstractContextFactory<
  Partial<OpenAPIV3_1.OperationObject>
> {
  constructor(
    registriesFactory: RegistriesFactory = new RegistriesFactory(),
    timerFactory: TimerFactory = new TimerFactory()
  ) {
    super(registriesFactory, timerFactory);
  }

  create(context: PartialContext<OperationContextData>): OperationContext {
    return super.create(context, {});
  }
}
