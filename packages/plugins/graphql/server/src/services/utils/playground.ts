import { Context } from '../types';

// TODO: deprecate and remove this because it is only used to determine if we need helmet security exceptions
// stores the state of the Apollo landingPage (playground)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default (ctx: Context) => {
  let enabled = false;

  return {
    setEnabled(val: boolean) {
      enabled = val;
    },
    isEnabled() {
      return enabled;
    },
  };
};
