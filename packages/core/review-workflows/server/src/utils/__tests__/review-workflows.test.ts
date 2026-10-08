import {
  DEFAULT_NUMBER_OF_WORKFLOWS,
  DEFAULT_STAGES_PER_WORKFLOW,
} from '../../constants/workflows';
import { resolveWorkflowLimits } from '../review-workflows';

const withOptions = (options: unknown) => ({ name: 'review-workflows', options });
const withBothLimits = (value: unknown) =>
  withOptions({ numberOfWorkflows: value, stagesPerWorkflow: value });

const defaults = {
  numberOfWorkflows: DEFAULT_NUMBER_OF_WORKFLOWS,
  stagesPerWorkflow: DEFAULT_STAGES_PER_WORKFLOW,
};

describe('resolveWorkflowLimits', () => {
  test.each([
    ['a limit below the default', 3, 3],
    ['a limit above the default', 9999, 9999],
    ['a numeric string', '300', 300],
    ['a fractional limit, rounded down', 2.5, 2],
  ])('uses %s from the license', (_, value, expected) => {
    expect(resolveWorkflowLimits(withBothLimits(value))).toEqual({
      numberOfWorkflows: expected,
      stagesPerWorkflow: expected,
    });
  });

  test.each([
    ['undefined', undefined],
    ['null', null],
    ['an empty string', ''],
    ['a non-numeric string', 'abc'],
    ['0', 0],
    ['negative', -5],
    ['not a number or a string', true],
  ])('falls back to the default when the license value is %s', (_, value) => {
    expect(resolveWorkflowLimits(withBothLimits(value))).toEqual(defaults);
  });

  test.each([
    ['the feature is not in the license', undefined],
    ['the license lists the feature by name only', 'review-workflows'],
    ['the feature has no options', { name: 'review-workflows' }],
    ['the options are null', withOptions(null)],
  ])('falls back to the default when %s', (_, feature) => {
    expect(resolveWorkflowLimits(feature)).toEqual(defaults);
  });

  test('resolves each limit on its own', () => {
    expect(resolveWorkflowLimits(withOptions({ numberOfWorkflows: 5 }))).toEqual({
      numberOfWorkflows: 5,
      stagesPerWorkflow: DEFAULT_STAGES_PER_WORKFLOW,
    });
  });
});
