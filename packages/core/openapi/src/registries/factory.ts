import { ComponentRegistry } from './components';

export class RegistriesFactory {
  createAll() {
    return {
      components: this.createComponentRegistry(),
    };
  }

  createComponentRegistry() {
    return new ComponentRegistry();
  }
}
