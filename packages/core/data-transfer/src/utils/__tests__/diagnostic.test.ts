import { createDiagnosticReporter } from '../diagnostic';

describe('createDiagnosticReporter', () => {
  describe('clear', () => {
    it('empties the stack so each transfer run is judged only on its own diagnostics', () => {
      const reporter = createDiagnosticReporter();

      reporter.report({
        kind: 'error',
        details: {
          message: 'First run error',
          createdAt: new Date(),
          name: 'Error',
          severity: 'error',
          error: new Error('First run error'),
        },
      });

      expect(reporter.stack.size).toBe(1);
      expect(reporter.stack.items.some((item) => item.kind === 'error')).toBe(true);

      reporter.clear();

      expect(reporter.stack.size).toBe(0);
      expect(reporter.stack.items).toEqual([]);
      expect(reporter.stack.items.some((item) => item.kind === 'error')).toBe(false);
    });

    it('allows reporting new diagnostics after clear', () => {
      const reporter = createDiagnosticReporter();

      reporter.report({
        kind: 'warning',
        details: { message: 'Before clear', createdAt: new Date() },
      });
      reporter.clear();
      reporter.report({
        kind: 'info',
        details: { message: 'After clear', createdAt: new Date(), origin: 'engine' },
      });

      expect(reporter.stack.size).toBe(1);
      expect(reporter.stack.items[0].kind).toBe('info');
      expect(reporter.stack.items[0].details.message).toBe('After clear');
    });
  });
});
