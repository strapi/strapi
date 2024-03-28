import { EventEmitter } from 'events';

export interface IDiagnosticReporterOptions {
  stackSize?: number;
}

export type GenericDiagnostic<K extends DiagnosticKind, T = unknown> = {
  kind: K;
  details: {
    message: string;
    createdAt: Date;
  } & T;
};

export type DiagnosticKind = 'error' | 'warning' | 'info';

export type DiagnosticListener<T extends DiagnosticKind = DiagnosticKind> = (
  diagnostic: { kind: T } & Diagnostic extends infer U ? U : never
) => void | Promise<void>;

export type DiagnosticEvent = 'diagnostic' | `diagnostic.${DiagnosticKind}`;

export type GetEventListener<E extends DiagnosticEvent> = E extends 'diagnostic'
  ? DiagnosticListener
  : E extends `diagnostic.${infer K}`
    ? K extends DiagnosticKind
      ? DiagnosticListener<K>
      : never
    : never;

export type Diagnostic = ErrorDiagnostic | WarningDiagnostic | InfoDiagnostic;

export type ErrorDiagnosticSeverity = 'fatal' | 'error' | 'silly';

export type ErrorDiagnostic = GenericDiagnostic<
  'error',
  {
    name: string;
    severity: ErrorDiagnosticSeverity;
    error: Error;
  }
>;

export type WarningDiagnostic = GenericDiagnostic<
  'warning',
  {
    origin?: string;
  }
>;

export type InfoDiagnostic<T = unknown> = GenericDiagnostic<
  'info',
  {
    params?: T;
  }
>;

export interface IDiagnosticReporter {
  stack: {
    readonly size: number;
    readonly items: Diagnostic[];
  };

  report(diagnostic: Diagnostic): IDiagnosticReporter;
  onDiagnostic(listener: DiagnosticListener): IDiagnosticReporter;
  on<T extends DiagnosticKind>(kind: T, listener: DiagnosticListener<T>): IDiagnosticReporter;
}

const createDiagnosticReporter = (
  options: IDiagnosticReporterOptions = {}
): IDiagnosticReporter => {
  const { stackSize = -1 } = options;

  const emitter = new EventEmitter();
  const stack: Diagnostic[] = [];

  const addListener = <T extends DiagnosticEvent>(event: T, listener: GetEventListener<T>) => {
    emitter.on(event, listener);
  };

  const isDiagnosticValid = (diagnostic: Diagnostic) => {
    if (!diagnostic.kind || !diagnostic.details || !diagnostic.details.message) {
      return false;
    }
    return true;
  };

  return {
    stack: {
      get size() {
        return stack.length;
      },

      get items() {
        return stack;
      },
    },

    report(diagnostic: Diagnostic) {
      if (!isDiagnosticValid(diagnostic)) {
        return this;
      }

      emitter.emit('diagnostic', diagnostic);
      emitter.emit(`diagnostic.${diagnostic.kind}`, diagnostic);

      if (stackSize !== -1 && stack.length >= stackSize) {
        stack.shift();
      }

      stack.push(diagnostic);

      return this;
    },

    onDiagnostic(listener: DiagnosticListener) {
      addListener('diagnostic', listener);

      return this;
    },

    on<T extends DiagnosticKind>(kind: T, listener: DiagnosticListener<T>) {
      addListener(`diagnostic.${kind}`, listener as never);

      return this;
    },
  };
};

export { createDiagnosticReporter };
