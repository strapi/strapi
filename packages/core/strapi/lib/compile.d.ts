interface CompileResult {
  appDir: string;
  distDir: string;
}

interface CompileOptions {
  appDir?: string;
  ignoreDiagnostics?: boolean;
}

type CompileFunction = (options?: CompileOptions) => Promise<CompileResult>;

export default CompileFunction;
