import release from './release';
import releaseValidation from './validation';
import scheduling from './scheduling';
import settings from './settings';

export const services = {
  release,
  'release-validation': releaseValidation,
  scheduling,
  settings,
};
