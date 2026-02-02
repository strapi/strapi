import type { DistinctQuestion } from 'inquirer';
import type { ProjectAnswers } from '../../../types';
import {
  getProjectNodeVersionDefault,
  getDefaultsFromQuestions,
  questionDefaultValuesMapper,
} from '../project-questions.utils';

describe('getProjectNodeVersionDefault', () => {
  it('should return the current node version if it is in the list of choices', () => {
    const currentNodeVersion = global.process.versions.node.split('.')[0];
    const question: DistinctQuestion<ProjectAnswers> = {
      name: 'nodeVersion',
      type: 'list',
      choices: [{ value: currentNodeVersion }, { value: '14' }],
    };

    const result = getProjectNodeVersionDefault(question);

    expect(result).toEqual(currentNodeVersion);
  });

  it('should return the default value if the current node version is not in the list of choices', () => {
    const question: DistinctQuestion<ProjectAnswers> = {
      name: 'nodeVersion',
      type: 'list',
      choices: [{ value: 'fake-ver' }, { value: 'fake-ver-2' }],
      default: 'fake-ver',
    };

    const result = getProjectNodeVersionDefault(question);

    expect(result).toEqual('fake-ver');
  });

  it('should return the default value if the question type is not a list', () => {
    const question: DistinctQuestion<ProjectAnswers> = {
      name: 'nodeVersion',
      type: 'input',
      default: '12',
    };

    const result = getProjectNodeVersionDefault(question);

    expect(result).toEqual('12');
  });
});

describe('getDefaultsFromQuestions', () => {
  it('should return the default values from questions with static defaults', () => {
    const questions: ReadonlyArray<DistinctQuestion<ProjectAnswers>> = [
      { name: 'name', type: 'input', default: 'Default Project' },
      { name: 'nodeVersion', type: 'input', default: '1' },
    ];

    const result = getDefaultsFromQuestions(questions);

    expect(result).toEqual({
      name: 'Default Project',
      nodeVersion: '1',
    });
  });

  it('should return an empty object when no questions have defaults', () => {
    const questions: ReadonlyArray<DistinctQuestion<ProjectAnswers>> = [
      { name: 'name', type: 'input', default: 'toto' },
      { name: 'nodeVersion', type: 'input' },
    ];

    const result = getDefaultsFromQuestions(questions);

    expect(result).toEqual({ name: 'toto' });
  });
});

describe('questionDefaultValuesMapper', () => {
  it('should apply static default values to questions', () => {
    const questions: ReadonlyArray<DistinctQuestion<ProjectAnswers>> = [
      { name: 'name', type: 'input' },
      { name: 'nodeVersion', type: 'input' },
    ];

    const mapper = {
      name: 'Default Project',
      nodeVersion: '1',
    };

    const result = questionDefaultValuesMapper(mapper)(questions);

    expect(result).toEqual([
      { name: 'name', type: 'input', default: 'Default Project' },
      { name: 'nodeVersion', type: 'input', default: '1' },
    ]);
  });

  it('should apply dynamic default values to questions', () => {
    const questions: ReadonlyArray<DistinctQuestion<ProjectAnswers>> = [
      { name: 'name', type: 'input' },
      { name: 'nodeVersion', type: 'input' },
    ];

    const mapper = {
      name: () => 'Dynamic Default',
      nodeVersion: () => '2',
    };

    const result = questionDefaultValuesMapper(mapper)(questions);

    expect(result).toEqual([
      { name: 'name', type: 'input', default: 'Dynamic Default' },
      { name: 'nodeVersion', type: 'input', default: '2' },
    ]);
  });

  it('should leave questions unchanged if they are not in the mapper', () => {
    const questions: ReadonlyArray<DistinctQuestion<ProjectAnswers>> = [
      { name: 'name', type: 'input' },
      { name: 'nodeVersion', type: 'input' },
    ];

    const mapper = {
      region: 'AMS',
    };

    const result = questionDefaultValuesMapper(mapper)(questions);

    expect(result).toEqual([
      { name: 'name', type: 'input' },
      { name: 'nodeVersion', type: 'input' },
    ]);
  });
});
