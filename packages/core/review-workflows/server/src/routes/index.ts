import reviewWorkflows from './review-workflows';
import homepage from '../homepage';

export default {
  'review-workflows': reviewWorkflows,
  ...homepage.routes,
};
