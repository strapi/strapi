import { DistinctQuestion } from 'inquirer';
import type { ProjectAnswers } from '../../types';

/**
 * Apply default values to questions based on the provided mapper
 * @param questionsMap - A partial object with keys matching the ProjectAnswers keys and values being the default value or a function to get the default value
 */
export function questionDefaultValuesMapper(
  questionsMap: Partial<{
    [K in keyof ProjectAnswers]:
      | ((question: DistinctQuestion<ProjectAnswers>) => ProjectAnswers[K])
      | ProjectAnswers[K];
  }>
) {
  return (
    questions: ReadonlyArray<DistinctQuestion<ProjectAnswers>>
  ): ReadonlyArray<DistinctQuestion<ProjectAnswers>> => {
    return questions.map((question) => {
      const questionName = question.name as keyof ProjectAnswers;

      // If the question is part of the mapper, apply the default value
      if (questionName in questionsMap) {
        const questionDefault = questionsMap[questionName];

        // If the default value is a function, call it with the question and get the default value
        if (typeof questionDefault === 'function') {
          return {
            ...question,
            default: questionDefault(question),
          };
        }
        // else we consider it as a static value
        return {
          ...question,
          default: questionDefault,
        };
      }
      // If the question is not part of the mapper, return the question as is
      return question;
    });
  };
}

/**
 * Get default values from questions
 * @param questions - An array of questions for project creation
 */
export function getDefaultsFromQuestions(
  questions: ReadonlyArray<DistinctQuestion<ProjectAnswers>>
): Partial<ProjectAnswers> {
  return questions.reduce((acc, question) => {
    if (question.default && question.name) {
      return { ...acc, [question.name]: question.default };
    }
    return acc;
  }, {});
}

/**
 * Get the default node version based on the current node version if it is in the list of choices
 * @param question - The question for the node version in project creation
 */
export function getProjectNodeVersionDefault(question: DistinctQuestion<ProjectAnswers>): string {
  const currentNodeVersion = process.versions.node.split('.')[0];

  // Node Version question is set up as a list, but the type of inquirer is dynamic and the question can change in the future (it comes from API)
  if (question.type === 'list' && Array.isArray(question.choices)) {
    const choice = question.choices.find((choice) => choice.value === currentNodeVersion);
    if (choice) {
      return choice.value;
    }
  }
  return question.default;
}
