import { RegistriesFactory } from '../../registries';

import type { PathItemContext, PathItemContextData } from '../../types';
import { TimerFactory } from '../../utils';

import type { PartialContext } from '../types';

import { AbstractContextFactory } from './abstract';

export class PathItemContextFactory extends AbstractContextFactory<PathItemContextData> {
  constructor(
    registriesFactory: RegistriesFactory = new RegistriesFactory(),
    timerFactory: TimerFactory = new TimerFactory()
  ) {
    super(registriesFactory, timerFactory);
  }

  create(context: PartialContext<PathItemContextData>): PathItemContext {
    return super.create(context, {});
  }
}
