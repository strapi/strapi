import { RulesEngine, Condition } from '../rules-engine';

describe('RulesEngine with is & isNot operator', () => {
  let engine: RulesEngine;

  beforeEach(() => {
    engine = new RulesEngine();
  });

  test('build and evaluate "is" operator with string', () => {
    const visibleRule: Condition = { dependsOn: 'type', operator: 'is', value: 'international' };
    expect(engine.evaluate(visibleRule, { type: 'international' })).toBe(true);
    expect(engine.evaluate(visibleRule, { type: 'blahblah' })).toBe(false);
  });

  test('build and evaluate "isNot" operator with string', () => {
    const visibleRule: Condition = {
      dependsOn: 'type',
      operator: 'isNot',
      value: 'international',
    };
    expect(engine.evaluate(visibleRule, { type: 'international' })).toBe(false);
    expect(engine.evaluate(visibleRule, { type: 'blahblah' })).toBe(true);
  });

  test('build and evaluate "is" operator with int', () => {
    const condition: Condition = { dependsOn: 'age', operator: 'is', value: 18 };
    const rule = engine.generate(condition);
    expect(rule).toEqual({ '==': [{ var: 'age' }, 18] });
    expect(engine.evaluate(condition, { age: 20 })).toBe(false);
    expect(engine.evaluate(condition, { age: 18 })).toBe(true);
  });

  test('build and evaluate "isNot" operator with int', () => {
    const condition: Condition = { dependsOn: 'age', operator: 'isNot', value: 18 };
    const rule = engine.generate(condition);
    expect(rule).toEqual({ '!=': [{ var: 'age' }, 18] });
    expect(engine.evaluate(condition, { age: 20 })).toBe(true);
    expect(engine.evaluate(condition, { age: 18 })).toBe(false);
  });
  test('build and evaluate "is" operator with boolean', () => {
    const condition: Condition = { dependsOn: 'isActive', operator: 'is', value: true };
    const rule = engine.generate(condition);
    expect(rule).toEqual({ '==': [{ var: 'isActive' }, true] });
    expect(engine.evaluate(condition, { isActive: true })).toBe(true);
    expect(engine.evaluate(condition, { isActive: false })).toBe(false);
  });

  test('build and evaluate "isNot" operator with boolean', () => {
    const condition: Condition = { dependsOn: 'isActive', operator: 'isNot', value: false };
    const rule = engine.generate(condition);
    expect(rule).toEqual({ '!=': [{ var: 'isActive' }, false] });
    expect(engine.evaluate(condition, { isActive: true })).toBe(true);
    expect(engine.evaluate(condition, { isActive: false })).toBe(false);
  });
});
