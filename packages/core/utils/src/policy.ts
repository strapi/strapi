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
      } catch {
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

/**
 * Builds a policy context: the own properties of `ctx`, with `type` and `is(type)`. The result keeps
 * the type of `ctx`, so a Koa context builds a `Core.PolicyContext`.
 */
const createPolicyContext = <TContext extends object>(type: string, ctx: TContext) => {
  return Object.assign(
    {
      is: (otherType: unknown) => type === otherType,
      get type() {
        return type;
      },
    },
    ctx
  );
};

export { createPolicy, createPolicyContext };
