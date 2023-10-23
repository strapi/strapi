/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable node/no-missing-require */

const { features } = require('@strapi/strapi/dist/utils/ee').default;
const { register } = require('../register');

jest.mock('@strapi/strapi/dist/utils/ee', () => {
  const eeModule = () => true;

  Object.assign(eeModule, {
    default: {
      features: {
        isEnabled: jest.fn(),
      },
    },
  });

  return eeModule;
});

describe('register', () => {
  jest.spyOn(console, 'log').mockImplementation(() => {});

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should log "cms-content-releases is enabled" if cms-content-releases feature is enabled', () => {
    features.isEnabled.mockReturnValue(true);
    register();
    expect(console.log).toHaveBeenCalledWith('cms-content-releases is enabled');
  });

  it('should not log "cms-content-releases is enabled" if cms-content-releases feature is disabled', () => {
    features.isEnabled.mockReturnValue(false);
    register();
    expect(console.log).not.toHaveBeenCalled();
  });
});
