import _ from 'lodash';
import { DistinctQuestion } from 'inquirer';
import { ProjectAnswers } from '../../types';

export function applyDefaultName(
  newDefaultName: string,
  questions: ReadonlyArray<DistinctQuestion<ProjectAnswers>>,
  defaultValues: Partial<ProjectAnswers>
): {
  newQuestions: ReadonlyArray<DistinctQuestion<ProjectAnswers>>;
  newDefaultValues: Partial<ProjectAnswers>;
} {
  const newDefaultValues = _.cloneDeep(defaultValues);
  newDefaultValues.name = newDefaultName;

  const newQuestions = questions.map((question) => {
    const questionCopy = _.cloneDeep(question);
    if (questionCopy.name === 'name') {
      questionCopy.default = newDefaultName;
    }
    return questionCopy;
  });

  return { newQuestions, newDefaultValues };
}
