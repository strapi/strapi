import release from './release';
import releaseValidation from './validation';
import scheduling from './scheduling';

export const services = {
  release,
  'release-validation': releaseValidation,
  scheduling,
};
