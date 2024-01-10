import releaseAction from './release-action';
import release from './release';
import releaseValidation from './validation';
import createEventManagerService from './event-manager';

export const services = {
  release,
  'release-action': releaseAction,
  'release-validation': releaseValidation,
  'event-manager': createEventManagerService,
};
