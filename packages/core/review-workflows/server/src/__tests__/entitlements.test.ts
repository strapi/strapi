import { registerReviewWorkflowsEntitlements } from '../entitlements';

const resolveWith = (feature: unknown) => {
  const register = jest.fn();
  registerReviewWorkflowsEntitlements({ ee: { entitlements: { register } } } as any);

  const [{ feature: name, limits }] = register.mock.calls[0];
  expect(name).toBe('review-workflows');
  return Object.fromEntries(limits.map((limit: any) => [limit.key, limit.get(feature)]));
};

describe('review-workflows entitlements', () => {
  it('reads the limits from the feature it is handed', () => {
    expect(
      resolveWith({
        name: 'review-workflows',
        options: { numberOfWorkflows: 5, stagesPerWorkflow: 8 },
      })
    ).toEqual({ numberOfWorkflows: 5, stagesPerWorkflow: 8 });
  });

  it('uses a license value above the default as is and defaults a missing one', () => {
    expect(resolveWith({ name: 'review-workflows', options: { numberOfWorkflows: 9999 } })).toEqual(
      { numberOfWorkflows: 9999, stagesPerWorkflow: 200 }
    );
    expect(resolveWith(undefined)).toEqual({ numberOfWorkflows: 200, stagesPerWorkflow: 200 });
  });
});
