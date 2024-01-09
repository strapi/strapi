import releaseAction from './release-action';
import release from './release';
import releaseValidation from './validation';

export const services = {
  release,
  'release-action': releaseAction,
  'release-validation': releaseValidation,
};
