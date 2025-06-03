import release from './release';
import releaseAction from './release-action';
import releaseValidation from './validation';
import scheduling from './scheduling';
import settings from './settings';

export const services = {
  release,
  'release-action': releaseAction,
  'release-validation': releaseValidation,
  scheduling,
  settings,
};
