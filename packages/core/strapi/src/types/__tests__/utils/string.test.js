"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const ts_zen_1 = require("ts-zen");
const STRING_UTILS_DTS_PATH = path_1.default.join(__dirname, '..', 'definitions', 'utils', 'string.d.ts');
/**
 * @type {import('ts-zen').AssertTypeSelector}
 */
let assertType;
describe('Utils.String', () => {
    beforeAll(() => {
        assertType = (0, ts_zen_1.fromFile)(STRING_UTILS_DTS_PATH, {
            compilerOptions: { strict: true },
            ignoreProjectOptions: true,
        });
    });
    test('Dict', () => {
        // TODO: Replace with isMappedType matcher when available
        assertType('NumberDict').equals('{ [x: string]: number; }');
        assertType('StringDict').equals('{ [x: string]: string; }');
        assertType('BooleanDict').equals('{ [x: string]: boolean; }');
    });
    test('EndsWith', () => {
        assertType('EndsWithCorrectNumber').isBooleanLiteral(true);
        assertType('EndsWithIncorrectNumber').isBooleanLiteral(false);
        assertType('EndsWithCorrectString').isBooleanLiteral(true);
        assertType('EndsWithIncorrectString').isBooleanLiteral(false);
    });
    test('StartsWith', () => {
        assertType('StartsWithCorrectNumber').isBooleanLiteral(true);
        assertType('StartsWithIncorrectNumber').isBooleanLiteral(false);
        assertType('StartsWithCorrectString').isBooleanLiteral(true);
        assertType('StartsWithIncorrectString').isBooleanLiteral(false);
    });
    test('Includes', () => {
        const template = (str) => [ts_zen_1.t.string(), String(str), ts_zen_1.t.string()];
        assertType('IncludesNumber').isTemplateLiteral(template(42));
        assertType('IncludesString').isTemplateLiteral(template('foo'));
        assertType('IncludesBoolean').isUnion([
            ts_zen_1.t.templateLiteral(template(true)),
            ts_zen_1.t.templateLiteral(template(false)),
        ]);
        assertType('IncludesBooleanLiteral').isTemplateLiteral(template(true));
    });
    test('NonEmpty', () => {
        assertType('NonEmptyOnEmptyString').isNever();
        assertType('NonEmptyOnNonEmptyString').isStringLiteral('Hello World');
    });
    test('Prefix', () => {
        assertType('PrefixEmptyString').isStringLiteral('Hello');
        assertType('PrefixString').isTemplateLiteral(['Hello ', ts_zen_1.t.string()]);
        assertType('PrefixLiteralString').isStringLiteral('Hello World');
        assertType('PrefixLiteralStringUnion').isUnion([
            ts_zen_1.t.stringLiteral('Hello World'),
            ts_zen_1.t.stringLiteral('Hello Everyone'),
        ]);
        assertType('PrefixLiteralStringWithUnion').isUnion([
            ts_zen_1.t.stringLiteral('Hello World'),
            ts_zen_1.t.stringLiteral('Bonjour World'),
            ts_zen_1.t.stringLiteral('Hola World'),
        ]);
    });
    test('Suffix', () => {
        assertType('SuffixEmptyString').isStringLiteral('Hello');
        assertType('SuffixString').isTemplateLiteral([ts_zen_1.t.string(), '.']);
        assertType('SuffixLiteralString').isStringLiteral('Hello World');
        assertType('SuffixLiteralStringUnion').isUnion([
            ts_zen_1.t.stringLiteral('Hello World'),
            ts_zen_1.t.stringLiteral('Bonjour World'),
            ts_zen_1.t.stringLiteral('Hola World'),
        ]);
        assertType('SuffixLiteralStringWithUnion').isUnion([
            ts_zen_1.t.stringLiteral('Hello World'),
            ts_zen_1.t.stringLiteral('Hello Everyone'),
        ]);
    });
    test('Literal', () => {
        assertType('Literal').isUnion([ts_zen_1.t.string(), ts_zen_1.t.number(), ts_zen_1.t.bigInt(), ts_zen_1.t.booleanLiteral()]);
    });
    test('Split', () => {
        assertType('SplitEmptyStringBySpace').isTuple([]);
        assertType('SplitEmptyStringByEmptyString').isTuple([]);
        assertType('SplitEmptyStringByString').isTuple([]);
        assertType('SplitBySpace').isTuple(['Hello', 'World,', 'How', 'are', 'you?'].map(ts_zen_1.t.stringLiteral));
        assertType('SplitByEmptyString').isTuple(['H', 'e', 'l', 'l', 'o'].map(ts_zen_1.t.stringLiteral));
        // This will use any string character as a delimiter, thus removing 1/2 characters
        assertType('SplitByString').isTuple(['H', 'l', 'o'].map(ts_zen_1.t.stringLiteral));
    });
});
//# sourceMappingURL=string.test.js.map