import core, {
  Transform,
  ASTPath,
  Property,
  ObjectProperty,
  ArrowFunctionExpression,
  ObjectExpression,
} from 'jscodeshift';
import path from 'node:path';

type AnyObjectProperty = ObjectProperty | Property;

/**
 * This codemod parses with `tsx`, which produces a Babel AST: object members are
 * `ObjectProperty` and strings are `StringLiteral`. The ESTree-only `j.Property` and
 * `j.Literal` checks never match those nodes, so both shapes are accepted here.
 */
const isObjectProperty = (j: core.JSCodeshift, node: unknown): node is AnyObjectProperty =>
  j.Property.check(node) || j.ObjectProperty.check(node);

const hasKeyName = (j: core.JSCodeshift, node: unknown, name: string): node is AnyObjectProperty =>
  isObjectProperty(j, node) && j.Identifier.check(node.key) && node.key.name === name;

const isStringWithValue = (j: core.JSCodeshift, node: unknown, value: string): boolean =>
  (j.Literal.check(node) || j.StringLiteral.check(node)) && node.value === value;

const findUploadPropertyInBody = (j: core.JSCodeshift, body: ObjectExpression) => {
  return body.properties.find((prop) => hasKeyName(j, prop, 'upload'));
};

const findConfigInUpload = (j: core.JSCodeshift, upload: ObjectExpression) => {
  return upload.properties.find((prop) => hasKeyName(j, prop, 'config'));
};

const getProviderProperty = (j: core.JSCodeshift, config: ObjectExpression) => {
  return config.properties.find(
    (prop) => hasKeyName(j, prop, 'provider') && isStringWithValue(j, prop.value, 'aws-s3')
  );
};

const getProviderOptions = (j: core.JSCodeshift, config: ObjectExpression) => {
  return config.properties.find((prop) => hasKeyName(j, prop, 'providerOptions'));
};

const getPropertyByKeyName = (j: core.JSCodeshift, object: ObjectExpression, keyName: string) => {
  return object.properties.find((prop) => hasKeyName(j, prop, keyName)) as AnyObjectProperty;
};

const removePropertiesByKeyName = (
  j: core.JSCodeshift,
  object: ObjectExpression,
  keyNames: string[]
) => {
  object.properties = object.properties.filter(
    (prop) => !keyNames.some((keyName) => hasKeyName(j, prop, keyName))
  );
};

/**
 *  This codemod only affects users that are using the `aws-s3` provider.
 *  It will wrap the `accessKeyId` and `secretAccessKey` properties inside a `credentials` object.
 */
const transform: Transform = (file, api) => {
  // Check if the current file is 'config/plugins.js'
  const cwd = process.cwd();
  const jsPluginsPath = path.join(cwd, 'config/plugins.js');
  const tsPluginsPath = path.join(cwd, 'config/plugins.ts');

  if (file.path !== jsPluginsPath && file.path !== tsPluginsPath) {
    return file.source;
  }

  const { j } = api;
  const root = j.withParser('tsx')(file.source);

  root
    .find(j.ArrowFunctionExpression)
    .forEach((arrowFunctionPath: ASTPath<ArrowFunctionExpression>) => {
      const body = arrowFunctionPath.node.body;

      // Check that the body of the arrow function is an object
      if (!j.ObjectExpression.check(body)) {
        return file.source;
      }

      const uploadProperty = findUploadPropertyInBody(j, body);

      // Check that we found an upload property and that it is an object
      if (!isObjectProperty(j, uploadProperty) || !j.ObjectExpression.check(uploadProperty.value)) {
        return file.source;
      }

      const configProperty = findConfigInUpload(j, uploadProperty.value);

      if (!isObjectProperty(j, configProperty) || !j.ObjectExpression.check(configProperty.value)) {
        return file.source;
      }

      const providerProperty = getProviderProperty(j, configProperty.value);

      // If there is not a provider property or it is not 'aws-s3', return the source
      if (!providerProperty) {
        return file.source;
      }

      const providerOptions = getProviderOptions(j, configProperty.value);

      if (
        !isObjectProperty(j, providerOptions) ||
        !j.ObjectExpression.check(providerOptions.value)
      ) {
        return file.source;
      }

      let accessKeyId: AnyObjectProperty | undefined;
      let secretAccessKey: AnyObjectProperty | undefined;

      // Check for accessKeyId and secretAccessKey directly under providerOptions
      const directAccessKeyId = getPropertyByKeyName(j, providerOptions.value, 'accessKeyId');

      const directSecretAccessKey = getPropertyByKeyName(
        j,
        providerOptions.value,
        'secretAccessKey'
      );

      let s3Options = getPropertyByKeyName(j, providerOptions.value, 's3Options');

      if (!s3Options) {
        // Create s3Options if it doesn't exist
        s3Options = j.objectProperty(j.identifier('s3Options'), j.objectExpression([]));
        providerOptions.value.properties.push(s3Options);
      }

      if (directAccessKeyId && directSecretAccessKey) {
        accessKeyId = directAccessKeyId;
        secretAccessKey = directSecretAccessKey;

        // Remove these properties from providerOptions
        removePropertiesByKeyName(j, providerOptions.value, ['accessKeyId', 'secretAccessKey']);
      } else if (isObjectProperty(j, s3Options) && j.ObjectExpression.check(s3Options.value)) {
        // Look inside s3Options
        accessKeyId = getPropertyByKeyName(j, s3Options.value, 'accessKeyId');
        secretAccessKey = getPropertyByKeyName(j, s3Options.value, 'secretAccessKey');
      }

      if (
        accessKeyId &&
        secretAccessKey &&
        isObjectProperty(j, s3Options) &&
        j.ObjectExpression.check(s3Options.value)
      ) {
        // Create the credentials object
        const credentials = j.objectExpression([
          j.objectProperty(j.identifier('accessKeyId'), accessKeyId.value),
          j.objectProperty(j.identifier('secretAccessKey'), secretAccessKey.value),
        ]);

        // Remove the old properties from s3Options
        removePropertiesByKeyName(j, s3Options.value, ['accessKeyId', 'secretAccessKey']);

        // Add the new credentials object to s3Options
        s3Options.value.properties.push(j.objectProperty(j.identifier('credentials'), credentials));
      }
    });

  return root.toSource();
};

export default transform;
