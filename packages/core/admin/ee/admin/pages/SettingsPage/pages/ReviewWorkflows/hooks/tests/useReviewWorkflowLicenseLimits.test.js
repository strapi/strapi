import { renderHook } from '@testing-library/react';

import { useReviewWorkflowLicenseLimits } from '../useReviewWorkflowLicenseLimits';

// TODO: use msw instead. I wish I could have done it already, but in its current
// state, useLicenseLimits requires to be wrapped in a redux provider and RBAC
// context provider and at the time of writing there wasn't any time to create
// that setup.

jest.mock('../../../../../../hooks', () => ({
  ...jest.requireActual('../../../../../../hooks'),
  useLicenseLimits: jest.fn(() => ({
    isLoading: false,
    license: {
      data: {
        something: true,
        features: [
          {
            name: 'review-workflows',
            options: {
              workflows: 10,
              stagesPerWorkflow: 10,
            },
          },
        ],
      },

      meta: {
        workflowCount: 2,
      },
    },
  })),
}));

function setup(...args) {
  return renderHook(() => useReviewWorkflowLicenseLimits(...args));
}

describe('useReviewWorkflowLicenseLimits', () => {
  it('returns options for the feature only', async () => {
    const { result } = setup();

    expect(result.current.limits).toStrictEqual({
      workflows: 10,
      stagesPerWorkflow: 10,
    });

    expect(result.current.meta).toStrictEqual({
      workflowCount: 2,
    });
  });
});
