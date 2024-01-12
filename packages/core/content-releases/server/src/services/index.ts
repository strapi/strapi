import releaseAction from './release-action';
import release from './release';
import releaseValidation from './validation';
import eventManager from './event-manager';

export const services = {
  release,
  'release-action': releaseAction,
  'release-validation': releaseValidation,
  'event-manager': eventManager,
};
