import axios from 'axios';
import { PluginBase } from '@itly/sdk';

export default class extends PluginBase {
  constructor(store) {
    super();
    this.store = store;
  }

  // eslint-disable-next-line class-methods-use-this
  id() {
    return 'strapi-destination';
  }

  track(_, event) {
    console.log('Itly tracking ', event);
    const uuid = this.store
      .getState()
      .get('app')
      .get('uuid');

    if (uuid) {
      axios
        .post('https://analytics.strapi.io/track', {
          event: event.name,
          properties: event.properties,
          uuid,
        })
        .catch(() => {
          /* Silent */
        });
    }
  }
}
