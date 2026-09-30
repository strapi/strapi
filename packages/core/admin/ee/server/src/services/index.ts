import auth from './auth';
import passport from './passport';
import role from './role';
import user from './user';
import metrics from './metrics';
import seatEnforcement from './seat-enforcement';

export default {
  auth,
  passport,
  role,
  user,
  metrics,
  'seat-enforcement': seatEnforcement,
};
