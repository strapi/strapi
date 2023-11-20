import './types/components.d.ts';
import './types/contentTypes.d.ts';

export default {
  schemas: require('./schemas'),
  fixtures: require('./fixtures'),
  locales: [
    { name: 'fr', code: 'fr' },
    { name: 'it', code: 'it' },
    { name: 'es', code: 'es' },
  ],
};
