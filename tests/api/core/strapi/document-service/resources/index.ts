import './types/components.js';
import './types/contentTypes.js';

export default {
  schemas: require('./schemas'),
  fixtures: require('./fixtures'),
  locales: [
    { name: 'nl', code: 'nl' }, // Dutch
    { name: 'it', code: 'it' }, // Italian
    { name: 'es', code: 'es' }, // Spanish
  ],
};
