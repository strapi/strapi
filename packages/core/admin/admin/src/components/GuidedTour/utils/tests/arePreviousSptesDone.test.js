import arePreviousStepsDone from '../arePreviousStepsDone';

describe('Guided Tour | utils | arePreviousStepsDone', () => {
  it('should return false if previous step is not done', () => {
    const step = 'contentTypeBuilder.success';
    const state = {
      contentTypeBuilder: { create: false, success: false },
      contentManager: { create: false, success: false },
      apiTokens: { create: false, success: false },
    };
    const result = arePreviousStepsDone(step, state);

    expect(result).toEqual(false);
  });

  it('should return true if previous step is done', () => {
    const step = 'contentTypeBuilder.success';
    const state = {
      contentTypeBuilder: { create: true, success: false },
      contentManager: { create: false, success: false },
      apiTokens: { create: false, success: false },
    };
    const result = arePreviousStepsDone(step, state);

    expect(result).toEqual(true);
  });
});
