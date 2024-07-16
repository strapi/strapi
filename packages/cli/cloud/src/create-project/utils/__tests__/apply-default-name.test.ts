import { DistinctQuestion } from 'inquirer';
import { applyDefaultName } from '../apply-default-name';
import { ProjectAnswers } from '../../../types';

describe('applyDefaultName', () => {
  it('should set the new default name in newDefaultValues and update the question default in newQuestions', () => {
    const newDefaultName = 'NewProjectName';
    const questions: ReadonlyArray<DistinctQuestion<ProjectAnswers>> = [
      { type: 'input', name: 'name', default: 'OldProjectName' },
      { type: 'input', name: 'description' },
    ];
    const defaultValues: Partial<ProjectAnswers> = { name: 'InitialName' };

    const { newQuestions, newDefaultValues } = applyDefaultName(
      newDefaultName,
      questions,
      defaultValues
    );

    expect(newDefaultValues.name).toEqual(newDefaultName);

    const nameQuestion = newQuestions.find((q) => q.name === 'name');
    expect(nameQuestion?.default).toEqual(newDefaultName);
  });

  it('should not modify questions if no name question exists, but still update newDefaultValues', () => {
    const newDefaultName = 'NewProjectName';
    const questions: ReadonlyArray<DistinctQuestion<ProjectAnswers>> = [
      { type: 'input', name: 'description' },
    ];
    const defaultValues: Partial<ProjectAnswers> = {};

    const { newQuestions, newDefaultValues } = applyDefaultName(
      newDefaultName,
      questions,
      defaultValues
    );

    // Check if newQuestions array is unchanged
    expect(newQuestions).toEqual(questions);
    expect(newDefaultValues.name).toEqual(newDefaultName);
  });
});
