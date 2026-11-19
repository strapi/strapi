/**
 * Compares the runtime shape of service results with their types under strict types. A probe module
 * returns named results; the API test describes each runtime value with `describeShape`, reads the
 * type of the probe variable of the same name with `typedShapes` (a strict program over the built
 * declarations), and compares both with `compareShapes`. Kinds only: values are never kept.
 */
import path from 'node:path';
import ts from 'typescript';

export type ShapeKind =
  'null' | 'undefined' | 'string' | 'number' | 'boolean' | 'date' | 'function' | 'array' | 'object';

/** The runtime shape of a value: its kind, its first element, its properties. */
export type Shape = { kind: ShapeKind; element?: Shape; props?: Record<string, Shape> };

/** The shape of a type: the kinds of its union members, its element and properties, `optional`. */
export type TypedShape = {
  kinds: string[];
  text: string;
  optional?: boolean;
  element?: TypedShape;
  props?: Record<string, TypedShape>;
};

/** One compared path: `ok`, or why the runtime value does not match its type. */
export type ShapeRow = {
  path: string;
  verdict: 'ok' | 'any' | 'mismatch' | 'typed-absent' | 'untyped-key' | 'no-typed-entry';
  typed: string;
  runtime: string;
};

export const describeShape = (value: unknown, depth = 4): Shape => {
  if (value === null) return { kind: 'null' };
  if (value === undefined) return { kind: 'undefined' };
  if (value instanceof Date) return { kind: 'date' };
  if (Array.isArray(value)) {
    if (value.length === 0 || depth === 0) return { kind: 'array' };
    return { kind: 'array', element: describeShape(value[0], depth - 1) };
  }
  switch (typeof value) {
    case 'string':
      return { kind: 'string' };
    case 'number':
    case 'bigint':
      return { kind: 'number' };
    case 'boolean':
      return { kind: 'boolean' };
    case 'function':
      return { kind: 'function' };
    default:
      break;
  }
  const props: Record<string, Shape> = {};
  if (depth > 0 && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      props[key] = describeShape(item, depth - 1);
    }
  }
  return { kind: 'object', props };
};

/** The options of a generated application with strict types. */
const strictProgramOptions: ts.CompilerOptions = {
  noEmit: true,
  strict: true,
  skipLibCheck: true,
  esModuleInterop: true,
  resolveJsonModule: true,
  types: [],
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
};

const isDate = (type: ts.Type) => type.symbol?.name === 'Date' || type.aliasSymbol?.name === 'Date';

/**
 * The typed shapes of the `const` declarations named `names` in `file`, and the program's errors in
 * that file. The probe module opts in to strict types itself (`@strapi/strapi/strict-types`).
 */
export const typedShapes = (file: string, names: string[]) => {
  const fileName = path.resolve(file);
  const program = ts.createProgram({ rootNames: [fileName], options: strictProgramOptions });
  const checker = program.getTypeChecker();
  const sourceFile = program.getSourceFile(fileName);
  if (sourceFile === undefined) {
    throw new Error(`The program does not load ${fileName}`);
  }
  const errors = ts
    .getPreEmitDiagnostics(program, sourceFile)
    .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, ' '));

  const format = ts.TypeFormatFlags.NoTruncation | ts.TypeFormatFlags.UseFullyQualifiedType;

  const shapeOf = (type: ts.Type, node: ts.Node, depth: number): TypedShape => {
    if ((type.flags & ts.TypeFlags.Any) !== 0) return { kinds: ['any'], text: 'any' };
    if ((type.flags & ts.TypeFlags.Unknown) !== 0) return { kinds: ['unknown'], text: 'unknown' };
    const parts = type.isUnion() ? type.types : [type];
    const kinds = new Set<string>();
    let objectPart: ts.Type | undefined;
    let arrayPart: ts.Type | undefined;
    for (const part of parts) {
      const flags = part.flags;
      if ((flags & ts.TypeFlags.Any) !== 0) kinds.add('any');
      else if ((flags & ts.TypeFlags.Unknown) !== 0) kinds.add('unknown');
      else if ((flags & ts.TypeFlags.Null) !== 0) kinds.add('null');
      else if ((flags & (ts.TypeFlags.Undefined | ts.TypeFlags.Void)) !== 0) kinds.add('undefined');
      else if ((flags & ts.TypeFlags.StringLike) !== 0) kinds.add('string');
      else if ((flags & (ts.TypeFlags.NumberLike | ts.TypeFlags.BigIntLike)) !== 0)
        kinds.add('number');
      else if ((flags & ts.TypeFlags.BooleanLike) !== 0) kinds.add('boolean');
      else if ((flags & ts.TypeFlags.Never) !== 0) continue;
      else if (checker.isArrayType(part) || checker.isTupleType(part)) {
        kinds.add('array');
        arrayPart = part;
      } else if (isDate(part)) kinds.add('date');
      else if (
        part.getCallSignatures().length > 0 &&
        checker.getPropertiesOfType(part).length === 0
      )
        kinds.add('function');
      else if (
        (flags & (ts.TypeFlags.Object | ts.TypeFlags.Intersection | ts.TypeFlags.NonPrimitive)) !==
        0
      ) {
        kinds.add('object');
        // A union of object types is compared with its first member.
        if (objectPart === undefined) objectPart = part;
      } else kinds.add(`other:${checker.typeToString(part)}`);
    }
    const shape: TypedShape = {
      kinds: [...kinds].sort(),
      text: checker.typeToString(type, undefined, format),
    };
    if (depth > 0 && arrayPart !== undefined) {
      // The number index of an array or a tuple is its element type.
      const element = checker.getIndexTypeOfType(arrayPart, ts.IndexKind.Number);
      if (element !== undefined) shape.element = shapeOf(element, node, depth - 1);
    }
    if (depth > 0 && objectPart !== undefined) {
      shape.props = {};
      for (const property of checker.getPropertiesOfType(objectPart)) {
        const propertyShape = shapeOf(
          checker.getTypeOfSymbolAtLocation(property, node),
          node,
          depth - 1
        );
        propertyShape.optional = (property.flags & ts.SymbolFlags.Optional) !== 0;
        shape.props[property.name] = propertyShape;
      }
    }
    return shape;
  };

  const shapes: Record<string, TypedShape> = {};
  const visit = (node: ts.Node) => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      names.includes(node.name.text)
    ) {
      shapes[node.name.text] = shapeOf(checker.getTypeAtLocation(node.name), node.name, 4);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);

  return { shapes, errors };
};

/**
 * Compares each runtime shape with the typed shape of the same name. A path matches when the
 * runtime kind is one of the typed kinds, or the type is `unknown`. A typed key absent at runtime
 * matches only when it is optional. Runtime keys the type omits are reported as `untyped-key`.
 */
export const compareShapes = (
  typed: Record<string, TypedShape>,
  runtime: Record<string, Shape>
): ShapeRow[] => {
  const rows: ShapeRow[] = [];

  const compare = (at: string, type: TypedShape | undefined, value: Shape | undefined) => {
    if (type === undefined) {
      rows.push({ path: at, verdict: 'untyped-key', typed: '-', runtime: value?.kind ?? '-' });
      return;
    }
    const kinds = type.kinds;
    if (kinds.includes('any')) {
      rows.push({ path: at, verdict: 'any', typed: 'any', runtime: value?.kind ?? '-' });
      return;
    }
    if (value === undefined) {
      const optional =
        type.optional === true || kinds.includes('undefined') || kinds.includes('unknown');
      rows.push({
        path: at,
        verdict: optional ? 'ok' : 'typed-absent',
        typed: kinds.join('|'),
        runtime: 'absent',
      });
      return;
    }
    if (kinds.includes('unknown')) {
      rows.push({ path: at, verdict: 'ok', typed: 'unknown', runtime: value.kind });
      return;
    }
    const matches = kinds.includes(value.kind);
    rows.push({
      path: at,
      verdict: matches ? 'ok' : 'mismatch',
      typed: kinds.join('|'),
      runtime: value.kind,
    });
    if (matches === false) return;
    if (value.kind === 'object' && type.props !== undefined) {
      const keys = new Set([...Object.keys(type.props), ...Object.keys(value.props ?? {})]);
      for (const key of [...keys].sort()) {
        compare(`${at}.${key}`, type.props[key], value.props?.[key]);
      }
    }
    if (value.kind === 'array' && type.element !== undefined && value.element !== undefined) {
      compare(`${at}[]`, type.element, value.element);
    }
  };

  for (const [name, value] of Object.entries(runtime)) {
    const type = typed[name];
    if (type === undefined) {
      rows.push({ path: name, verdict: 'no-typed-entry', typed: '-', runtime: value.kind });
    } else {
      compare(name, type, value);
    }
  }

  return rows;
};
