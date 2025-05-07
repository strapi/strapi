import jsonLogic from 'json-logic-js';
import { z } from 'zod';

export const ConditionSchema = z.discriminatedUnion('operator', [
  z.object({
    dependsOn: z.string().nonempty(),
    operator: z.literal('is'),
    value: z.any(),
  }),
  z.object({
    dependsOn: z.string().nonempty(),
    operator: z.literal('isNot'),
    value: z.any(),
  }),
]);
export type Condition = z.infer<typeof ConditionSchema>;

export class RulesEngine {
  /**
   * generate a JSON-Logic AST from a given Condition.
   */
  generate(condition: Condition): any {
    const { dependsOn, operator, value } = condition;
    const opSymbol = operator === 'is' ? '==' : '!=';
    return { [opSymbol]: [{ var: dependsOn }, value] };
  }

  /**
   * Validates a Condition using Zod condition schema. Throws if invalid.
   */

  validate(condition: unknown): void {
    ConditionSchema.parse(condition);
  }

  /**
   * Evaluates a condition against provided data.
   * Throws if invalid.
   */

  evaluate(condition: any, data: Record<string, any>): boolean {
    let logic = condition;
    if (
      condition &&
      typeof condition === 'object' &&
      'dependsOn' in condition &&
      'operator' in condition
    ) {
      this.validate(condition);
      logic = this.generate(condition as Condition);
    }
    try {
      return !!jsonLogic.apply(logic, data);
    } catch (err: any) {
      throw new Error(`Invalid condition: ${err.message}`);
    }
  }
}

export function createRulesEngine(): RulesEngine {
  return new RulesEngine();
}
