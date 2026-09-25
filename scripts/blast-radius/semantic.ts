import { posix, resolve as resolvePath } from 'node:path';
import { builtinModules } from 'node:module';
import ts from 'typescript';
import { compareCodePoints, sortCodePoints } from './ordering';
import { isNonRuntimePath } from './paths';

export type SemanticInput = {
  path: string;
  status?: string;
  binary?: boolean;
  changedRanges: Array<{ start: number; end: number }>;
  nxProjects: readonly string[];
  projectRoots: Record<string, string>;
  reverseDependencies: Record<string, readonly string[]>;
  files?: Record<string, string>;
  sourceComplete?: boolean;
};
type Declaration = { path: string; name: string; offset: number };
type Reference = { path: string; project: string; offset: number };
type SemanticResult = {
  decision: 'narrowed' | 'nx-fallback';
  semanticProjects: string[];
  finalProjects: string[];
  reasonCodes: string[];
  declarations: Declaration[];
  references: Reference[];
};
const extensions = ['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs'];
const sorted = (values: Iterable<string>) => sortCodePoints([...values]);
const ownerFor = (path: string, roots: Record<string, string>) =>
  Object.entries(roots)
    .filter(([, root]) => path === root || path.startsWith(`${root}/`))
    .map(([project]) => project);
const fallback = (input: SemanticInput, reason: string): SemanticResult => ({
  decision: 'nx-fallback',
  semanticProjects: [],
  finalProjects: sorted(input.nxProjects),
  reasonCodes: [reason],
  declarations: [],
  references: [],
});

function resolveModule(
  moduleName: string,
  containingFile: string,
  files: Readonly<Record<string, string>>,
  roots: Record<string, string>
): ts.ResolvedModuleFull | undefined {
  const candidates: string[] = [];
  const projectEntry = Object.entries(roots).find(
    ([project]) => moduleName === project || moduleName.startsWith(`${project}/`)
  );
  if (moduleName.startsWith('.'))
    candidates.push(posix.normalize(posix.join(posix.dirname(containingFile), moduleName)));
  else {
    if (projectEntry) {
      const [project, root] = projectEntry;
      const suffix = moduleName.slice(project.length).replace(/^\//, '');
      candidates.push(
        suffix ? `${root}/${suffix}` : root,
        suffix ? `${root}/src/${suffix}` : `${root}/src`
      );
    }
    const suffix = moduleName.split('/').at(-1);
    const root = Object.values(roots).find((value) => posix.basename(value) === suffix);
    if (root) candidates.push(root, `${root}/src`, `${root}/index`);
  }
  for (const candidate of candidates) {
    for (const extension of extensions) {
      const fileName = `${candidate}${extension}`;
      if (fileName in files) return { resolvedFileName: fileName, extension: ts.Extension.Ts };
    }
    for (const extension of extensions) {
      const fileName = `${candidate}/index${extension}`;
      if (fileName in files) return { resolvedFileName: fileName, extension: ts.Extension.Ts };
    }
    const onlySource = Object.keys(files).filter(
      (fileName) =>
        fileName.startsWith(`${candidate}/src/`) &&
        extensions.some((extension) => fileName.endsWith(extension))
    );
    if (!(projectEntry && moduleName.startsWith('@strapi/')) && onlySource.length === 1)
      return { resolvedFileName: onlySource[0]!, extension: ts.Extension.Ts };
  }
  if (projectEntry && moduleName.startsWith('@strapi/')) return undefined;
  return ts.resolveModuleName(
    moduleName,
    resolvePath(process.cwd(), containingFile),
    {
      allowJs: true,
      module: ts.ModuleKind.NodeNext,
      moduleResolution: ts.ModuleResolutionKind.NodeNext,
    },
    ts.sys
  ).resolvedModule;
}
const nodeBuiltins = new Set(builtinModules.map((moduleName) => moduleName.replace(/^node:/, '')));
const isNodeBuiltin = (moduleName: string) => nodeBuiltins.has(moduleName.replace(/^node:/, ''));

function createService(files: Readonly<Record<string, string>>, roots: Record<string, string>) {
  const names = Object.keys(files).sort();
  const host: ts.LanguageServiceHost = {
    getCompilationSettings: () => ({
      allowJs: true,
      checkJs: false,
      module: ts.ModuleKind.NodeNext,
      moduleResolution: ts.ModuleResolutionKind.NodeNext,
      target: ts.ScriptTarget.ES2022,
    }),
    getScriptFileNames: () => names,
    getScriptVersion: () => '1',
    getScriptSnapshot: (fileName) =>
      files[fileName] === undefined
        ? (() => {
            const source = ts.sys.readFile(fileName);
            return source === undefined ? undefined : ts.ScriptSnapshot.fromString(source);
          })()
        : ts.ScriptSnapshot.fromString(files[fileName]!),
    getCurrentDirectory: () => '.',
    getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
    fileExists: (fileName) => fileName in files || ts.sys.fileExists(fileName),
    readFile: (fileName) => files[fileName] ?? ts.sys.readFile(fileName),
    readDirectory: ts.sys.readDirectory,
    directoryExists: (directoryName) =>
      names.some((fileName) => fileName.startsWith(`${directoryName.replace(/\/$/, '')}/`)),
    getDirectories: ts.sys.getDirectories,
    resolveModuleNames: (moduleNames, containingFile) =>
      moduleNames.map((moduleName) => resolveModule(moduleName, containingFile, files, roots)),
  };
  return ts.createLanguageService(host, ts.createDocumentRegistry());
}

function rangeBounds(source: ts.SourceFile, range: { start: number; end: number }) {
  const lineCount = source.getLineAndCharacterOfPosition(source.end).line + 1;
  const startLine = Math.max(0, Math.min(range.start, lineCount - 1));
  const endLine = Math.max(startLine + 1, Math.min(range.end, lineCount));
  return {
    start: source.getPositionOfLineAndCharacter(startLine, 0),
    end: endLine === lineCount ? source.end : source.getPositionOfLineAndCharacter(endLine, 0),
  };
}
function declarationsForRanges(
  source: ts.SourceFile,
  ranges: readonly { start: number; end: number }[]
): ts.NamedDeclaration[] | undefined {
  const result: ts.NamedDeclaration[] = [];
  for (const range of ranges) {
    const bounds = rangeBounds(source, range);
    const candidates: ts.NamedDeclaration[] = [];
    const visit = (node: ts.Node): void => {
      if (bounds.end <= node.getStart(source) || bounds.start >= node.getEnd()) return;
      if (
        (ts.isFunctionDeclaration(node) ||
          ts.isClassDeclaration(node) ||
          ts.isInterfaceDeclaration(node) ||
          ts.isEnumDeclaration(node) ||
          ts.isVariableDeclaration(node)) &&
        node.name
      )
        candidates.push(node);
      node.forEachChild(visit);
    };
    visit(source);
    candidates.sort((left, right) => left.getWidth(source) - right.getWidth(source));
    if (candidates.length !== 1) return undefined;
    result.push(candidates[0]!);
  }
  return result;
}
const importOrExportName = (node: ts.Node) =>
  ts.isImportSpecifier(node.parent) ||
  ts.isImportClause(node.parent) ||
  ts.isNamespaceImport(node.parent) ||
  ts.isExportSpecifier(node.parent);
function tokenAt(source: ts.SourceFile, position: number): ts.Node {
  let result: ts.Node = source;
  const visit = (node: ts.Node): void => {
    if (position < node.getStart(source) || position >= node.getEnd()) return;
    result = node;
    node.forEachChild(visit);
  };
  visit(source);
  return result;
}
function hasTopLevelEvaluation(source: ts.SourceFile): boolean {
  return source.statements.some((statement) => {
    if (
      (ts.isImportDeclaration(statement) && statement.importClause !== undefined) ||
      ts.isInterfaceDeclaration(statement) ||
      ts.isTypeAliasDeclaration(statement) ||
      ts.isFunctionDeclaration(statement)
    )
      return false;
    if (ts.isVariableStatement(statement))
      return statement.declarationList.declarations.some((declaration) => {
        const initializer = declaration.initializer;
        return (
          initializer !== undefined &&
          !ts.isStringLiteral(initializer) &&
          !ts.isNumericLiteral(initializer) &&
          !ts.isArrowFunction(initializer) &&
          !ts.isFunctionExpression(initializer) &&
          initializer.kind !== ts.SyntaxKind.TrueKeyword &&
          initializer.kind !== ts.SyntaxKind.FalseKeyword &&
          initializer.kind !== ts.SyntaxKind.NullKeyword
        );
      });
    return true;
  });
}

function isProductionCandidate(
  fileName: string,
  input: SemanticInput
): fileName is keyof NonNullable<SemanticInput['files']> & string {
  if (!/\.(?:[cm]?[jt]sx?)$/.test(fileName) || isNonRuntimePath(fileName)) return false;
  const owners = ownerFor(fileName, input.projectRoots);
  return owners.length === 1 && input.nxProjects.includes(owners[0]!);
}

type ModuleReference = { moduleName: string };

function moduleName(expression: ts.Expression | undefined): string | undefined {
  return expression && ts.isStringLiteralLike(expression) ? expression.text : undefined;
}

function importTypeModuleName(argument: ts.TypeNode): string | undefined {
  return ts.isLiteralTypeNode(argument) && ts.isStringLiteralLike(argument.literal)
    ? argument.literal.text
    : undefined;
}

function moduleReferences(source: ts.SourceFile): ModuleReference[] {
  const references: ModuleReference[] = [];
  const add = (expression: ts.Expression | undefined) => {
    const name = moduleName(expression);
    references.push({ moduleName: name ?? '' });
  };
  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node)) add(node.moduleSpecifier);
    else if (ts.isExportDeclaration(node) && node.moduleSpecifier) add(node.moduleSpecifier);
    else if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference)
    )
      add(node.moduleReference.expression);
    else if (ts.isImportTypeNode(node))
      references.push({ moduleName: importTypeModuleName(node.argument) ?? '' });
    else if (ts.isCallExpression(node)) {
      const dynamicImport = node.expression.kind === ts.SyntaxKind.ImportKeyword;
      const requireCall = ts.isIdentifier(node.expression) && node.expression.text === 'require';
      if (dynamicImport || requireCall) add(node.arguments[0]);
    }
    node.forEachChild(visit);
  };
  visit(source);
  return references;
}

function hasIndirectCommonJsLoader(source: ts.SourceFile): boolean {
  let indirect = false;
  const visit = (node: ts.Node): void => {
    if (indirect) return;
    if (ts.isIdentifier(node) && node.text === 'createRequire') {
      indirect = true;
      return;
    }
    if (ts.isIdentifier(node) && node.text === 'require') {
      const parent = node.parent;
      const directLiteralCall =
        ts.isCallExpression(parent) &&
        parent.expression === node &&
        parent.arguments.length === 1 &&
        ts.isStringLiteralLike(parent.arguments[0]!);
      if (!directLiteralCall) {
        indirect = true;
        return;
      }
    }
    node.forEachChild(visit);
  };
  visit(source);
  return indirect;
}

export async function narrowWithTypeScript(input: SemanticInput): Promise<SemanticResult> {
  if (input.status === 'renamed' || input.status === 'deleted')
    return fallback(input, 'renamed-path');
  if (input.binary) return fallback(input, 'binary-path');
  if (!/\.(?:[cm]?[jt]sx?)$/.test(input.path) || isNonRuntimePath(input.path))
    return fallback(input, 'ineligible-path');
  if (!input.changedRanges.length) return fallback(input, 'missing-hunks');
  if (!input.files || !(input.path in input.files)) return fallback(input, 'missing-source');
  if (input.sourceComplete === false) return fallback(input, 'source-load-incomplete');
  const owners = ownerFor(input.path, input.projectRoots);
  if (owners.length !== 1) return fallback(input, 'ambiguous-owner');
  try {
    const service = createService(input.files, input.projectRoots);
    const program = service.getProgram();
    const source = program?.getSourceFile(input.path);
    if (!program || !source || program.getSyntacticDiagnostics(source).length)
      return fallback(input, 'diagnostic');
    if (hasTopLevelEvaluation(source)) return fallback(input, 'top-level-side-effect');
    const declarations = declarationsForRanges(source, input.changedRanges);
    if (!declarations) return fallback(input, 'unresolved-declaration');

    const candidateSources = new Map<string, ts.SourceFile>();
    for (const [fileName] of Object.entries(input.files)) {
      if (!isProductionCandidate(fileName, input)) continue;
      const candidate = program.getSourceFile(fileName);
      if (!candidate || program.getSyntacticDiagnostics(candidate).length)
        return fallback(input, 'candidate-diagnostic');
      candidateSources.set(fileName, candidate);
    }

    for (const [fileName, candidate] of candidateSources) {
      if (hasIndirectCommonJsLoader(candidate))
        return fallback(input, 'module-resolution-incomplete');
      for (const imported of moduleReferences(candidate)) {
        if (
          resolveModule(imported.moduleName, fileName, input.files, input.projectRoots) ||
          isNodeBuiltin(imported.moduleName)
        )
          continue;
        return fallback(input, 'module-resolution-incomplete');
      }
    }

    const entriesByDeclaration: ts.ReferenceEntry[][] = [];
    for (const declaration of declarations) {
      const entries = service.getReferencesAtPosition(
        input.path,
        declaration.name!.getStart(source)
      );
      if (!entries) return fallback(input, 'unresolved-reference');
      entriesByDeclaration.push(entries);
    }
    const declarationEvidence = declarations.map((declaration) => ({
      path: input.path,
      name: declaration.name!.getText(source),
      offset: declaration.name!.getStart(source),
    }));
    const projects = new Set<string>(owners);
    const reverseSeeds = new Set<string>();
    const references: Reference[] = [];
    for (const [index, declaration] of declarations.entries()) {
      const position = declaration.name!.getStart(source);
      for (const entry of entriesByDeclaration[index]!) {
        const referenceSource = program.getSourceFile(entry.fileName);
        if (!referenceSource || isNonRuntimePath(entry.fileName)) continue;
        const owner = ownerFor(entry.fileName, input.projectRoots);
        if (owner.length !== 1 || !input.nxProjects.includes(owner[0]!)) continue;
        const token = tokenAt(referenceSource, entry.textSpan.start);
        if (
          (entry.fileName === input.path && entry.textSpan.start === position) ||
          importOrExportName(token)
        )
          continue;
        projects.add(owner[0]!);
        reverseSeeds.add(owner[0]!);
        references.push({ path: entry.fileName, project: owner[0]!, offset: entry.textSpan.start });
      }
    }
    const queue = [...reverseSeeds];
    for (const project of queue)
      for (const dependant of input.reverseDependencies[project] ?? [])
        if (input.nxProjects.includes(dependant) && !projects.has(dependant)) {
          projects.add(dependant);
          queue.push(dependant);
        }
    const finalProjects = sorted(
      [...projects].filter((project) => input.nxProjects.includes(project))
    );
    return {
      decision: 'narrowed',
      semanticProjects: finalProjects,
      finalProjects,
      reasonCodes: ['semantic-proof'],
      declarations: declarationEvidence.sort(
        (a, b) => compareCodePoints(a.path, b.path) || a.offset - b.offset
      ),
      references: references.sort(
        (a, b) => compareCodePoints(a.path, b.path) || a.offset - b.offset
      ),
    };
  } catch {
    return fallback(input, 'semantic-exception');
  }
}
