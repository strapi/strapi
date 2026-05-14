import { createRulesEngine, Condition } from '../rulesEngine';

describe('RulesEngine with is & isNot operator', () => {
  const engine = createRulesEngine();

  describe('validate()', () => {
    it('should validate a correct condition', () => {
      const condition: Condition = { dependsOn: 'type', operator: 'is', value: 'foo' };
      expect(() => engine.validate(condition)).not.toThrow();
    });

    it('should throw on invalid condition', () => {
      const invalidCondition = { dependsOn: '', operator: 'is', value: 'bar' };
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      expect(() => engine.validate(invalidCondition)).toThrowError();
    });
  });

  describe('generate() and evaluate()', () => {
    const cases: { condition: Condition; data: any; expected: boolean }[] = [
      {
        condition: { dependsOn: 'type', operator: 'is', value: 'international' },
        data: { type: 'international' },
        expected: true,
      },
      {
        condition: { dependsOn: 'type', operator: 'is', value: 'international' },
        data: { type: 'local' },
        expected: false,
      },
      {
        condition: { dependsOn: 'type', operator: 'isNot', value: 'draft' },
        data: { type: 'published' },
        expected: true,
      },
      {
        condition: { dependsOn: 'type', operator: 'isNot', value: 'published' },
        data: { type: 'published' },
        expected: false,
      },
      {
        condition: { dependsOn: 'age', operator: 'is', value: 18 },
        data: { age: 18 },
        expected: true,
      },
      {
        condition: { dependsOn: 'age', operator: 'isNot', value: 18 },
        data: { age: 18 },
        expected: false,
      },
      {
        condition: { dependsOn: 'isActive', operator: 'is', value: true },
        data: { isActive: true },
        expected: true,
      },
      {
        condition: { dependsOn: 'isActive', operator: 'isNot', value: false },
        data: { isActive: true },
        expected: true,
      },
    ];

    cases.forEach(({ condition, data, expected }, idx) => {
      it(`should correctly evaluate case #${idx + 1}`, () => {
        const logic = engine.generate(condition);
        expect(engine.evaluate(logic, data)).toBe(expected);
      });
    });
  });

  describe('evaluate() error handling', () => {
    it('should throw on invalid logic input', () => {
      expect(() => engine.evaluate({ foo: 'bar' } as any, {})).toThrow(
        'Invalid condition: Unrecognized operation foo'
      );
    });
  });
});
