import type {
  Requirement as RequirementInterface,
  RequirementTestCallback,
  TestContext,
  TestResult,
} from './types';

export class Requirement implements RequirementInterface {
  readonly isRequired: boolean;

  readonly name: string;

  readonly testCallback: RequirementTestCallback | null;

  children: RequirementInterface[];

  constructor(name: string, testCallback: RequirementTestCallback | null, isRequired?: boolean) {
    this.name = name;
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

  asOptional() {
    const newInstance = requirementFactory(this.name, this.testCallback, false);

    newInstance.setChildren(this.children);

    return newInstance;
  }

  asRequired() {
    const newInstance = requirementFactory(this.name, this.testCallback, true);

    newInstance.setChildren(this.children);

    return newInstance;
  }

  async test(context: TestContext) {
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

const ok = (): TestResult => ({ pass: true, error: null });

const errored = (error: Error): TestResult => ({ pass: false, error });

export const requirementFactory = (
  name: string,
  testCallback: RequirementTestCallback | null,
  isRequired?: boolean
) => new Requirement(name, testCallback, isRequired);
