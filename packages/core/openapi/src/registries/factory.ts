import { ComponentRegistry } from './components';

export class RegistriesFactory {
  createAll() {
    return {
      components: this._createComponentRegistry(),
    };
  }

  private _createComponentRegistry() {
    return new ComponentRegistry();
  }
}
