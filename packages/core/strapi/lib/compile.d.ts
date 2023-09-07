interface CompileResult {
  appDir: string;
  distDir: string;
}

type CompileFunction = (dir?: string) => Promise<CompileResult>;

export const compile: CompileFunction;
