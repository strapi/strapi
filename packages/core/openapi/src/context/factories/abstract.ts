import type { RegistriesFactory } from '../../registries';
import type { TimerFactory } from '../../utils';

import type { Context, ContextFactory, ContextOutput, PartialContext } from '../types';

export abstract class AbstractContextFactory<T> implements ContextFactory<T> {
  private readonly _registriesFactory: RegistriesFactory;

  private readonly _timerFactory: TimerFactory;

  protected constructor(registriesFactory: RegistriesFactory, timerFactory: TimerFactory) {
    this._registriesFactory = registriesFactory;
    this._timerFactory = timerFactory;
  }

  public create(context: PartialContext<T>, defaultValue: T): Context<T> {
    const { strapi, routes } = context;

    // Allow overrides to share registries and timer in case the context is used in sub-assemblers
    const timer = context.timer ?? this._timerFactory.create();
    const registries = context.registries ?? this._registriesFactory.createAll();

    // Default output initialized with the given default value
    const output = this.createDefaultOutput(defaultValue);

    return { strapi, routes, timer, registries, output };
  }

  protected createDefaultOutput(data: T): ContextOutput<T> {
    return {
      stats: { time: { startTime: 0, endTime: 0, elapsedTime: 0 } },
      data,
    };
  }
}
