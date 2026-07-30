import { RegistriesFactory } from '../../registries';

import type { PathContext, PathContextData } from '../../types';
import { TimerFactory } from '../../utils';

import type { PartialContext } from '../types';

import { AbstractContextFactory } from './abstract';

export class PathContextFactory extends AbstractContextFactory<PathContextData> {
  constructor(
    registriesFactory: RegistriesFactory = new RegistriesFactory(),
    timerFactory: TimerFactory = new TimerFactory()
  ) {
    super(registriesFactory, timerFactory);
  }

  create(context: PartialContext<PathContextData>): PathContext {
    return super.create(context, {});
  }
}
