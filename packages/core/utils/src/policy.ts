import { eq } from 'lodash/fp';

interface Options {
  name: string;
  validator?(config: unknown): void;
  handler(...args: any[]): any;
}

const createPolicy = (options: Options) => {
  const { name = 'unnamed', validator, handler } = options;

  const wrappedValidator = (config: unknown) => {
    if (validator) {
      try {
        validator(config);
      } catch (e) {
        throw new Error(`Invalid config passed to "${name}" policy.`);
      }
    }
  };

  return {
    name,
    validator: wrappedValidator,
    handler,
  };
};

const createPolicyContext = (type: string, ctx: object) => {
  return Object.assign(
    {
      is: eq(type),
      get type() {
        return type;
      },
    },
    ctx
  );
};

export { createPolicy, createPolicyContext };
