import type {
  Requirement as RequirementInterface,
  RequirementTestCallback,
  TestContext,
  TestResult,
} from './types';

export class Requirement implements RequirementInterface {
  readonly isRequired: boolean;

  readonly name: string;

  readonly description: string;

  readonly testCallback: RequirementTestCallback | null;

  children: RequirementInterface[];

  constructor(
    name: string,
    description: string,
    testCallback: RequirementTestCallback | null,
    isRequired?: boolean
  ) {
    this.name = name;
    this.description = description;
    this.testCallback = testCallback;
    this.isRequired = isRequired ?? true;
    this.children = [];
  }

  setChildren(children: RequirementInterface[]) {
    this.children = children;
    return this;
  }

  addChild(child: RequirementInterface) {
    this.children.push(child);
    return this;
  }

  optional() {
    return requirementFactory(this.name, this.description, this.testCallback, false).setChildren(
      this.children
    );
  }

  required() {
    return requirementFactory(this.name, this.description, this.testCallback, true).setChildren(
      this.children
    );
  }

  async test(context: TestContext) {
    const ok = (): TestResult => ({ pass: true, error: null });
    const errored = (error: Error): TestResult => ({ pass: false, error });

    try {
      await this.testCallback?.(context);
      return ok();
    } catch (e) {
      if (e instanceof Error) {
        return errored(e);
      }

      if (typeof e === 'string') {
        return errored(new Error(e));
      }

      return errored(new Error('Unknown error'));
    }
  }
}

export const requirementFactory = (
  name: string,
  description: string,
  testCallback: RequirementTestCallback | null,
  isRequired?: boolean
) => new Requirement(name, description, testCallback, isRequired);
