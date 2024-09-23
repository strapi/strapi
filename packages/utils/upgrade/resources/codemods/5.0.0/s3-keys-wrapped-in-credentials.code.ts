import core, {
  Transform,
  ASTPath,
  Property,
  ArrowFunctionExpression,
  ObjectExpression,
} from 'jscodeshift';
import path from 'node:path';

const findUploadPropertyInBody = (j: core.JSCodeshift, body: ObjectExpression) => {
  return body.properties.find(
    (prop: any) =>
      j.Property.check(prop) && j.Identifier.check(prop.key) && prop.key.name === 'upload'
  );
};

const findConfigInUpload = (j: core.JSCodeshift, upload: ObjectExpression) => {
  return upload.properties.find(
    (prop) => j.Property.check(prop) && j.Identifier.check(prop.key) && prop.key.name === 'config'
  );
};

const getProviderProperty = (j: core.JSCodeshift, config: ObjectExpression) => {
  return config.properties.find(
    (prop) =>
      j.Property.check(prop) &&
      j.Identifier.check(prop.key) &&
      prop.key.name === 'provider' &&
      j.Literal.check(prop.value) &&
      prop.value.value === 'aws-s3'
  );
};

const getProviderOptions = (j: core.JSCodeshift, config: ObjectExpression) => {
  return config.properties.find(
    (prop) =>
      j.Property.check(prop) && j.Identifier.check(prop.key) && prop.key.name === 'providerOptions'
  );
};

const getPropertyByKeyName = (j: core.JSCodeshift, object: ObjectExpression, keyName: string) => {
  return object.properties.find(
    (prop) => j.Property.check(prop) && j.Identifier.check(prop.key) && prop.key.name === keyName
  ) as Property;
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
      if (!j.Property.check(uploadProperty) || !j.ObjectExpression.check(uploadProperty.value)) {
        return file.source;
      }

      const configProperty = findConfigInUpload(j, uploadProperty.value);

      if (!j.Property.check(configProperty) || !j.ObjectExpression.check(configProperty.value)) {
        return file.source;
      }

      const providerProperty = getProviderProperty(j, configProperty.value);

      // If there is not a provider property or it is not 'aws-s3', return the source
      if (!providerProperty) {
        return file.source;
      }

      const providerOptions = getProviderOptions(j, configProperty.value);

      if (!j.Property.check(providerOptions) || !j.ObjectExpression.check(providerOptions.value)) {
        return file.source;
      }

      let accessKeyId: Property | undefined;
      let secretAccessKey: Property | undefined;

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
        s3Options = j.property('init', j.identifier('s3Options'), j.objectExpression([]));
        providerOptions.value.properties.push(s3Options);
      }

      if (directAccessKeyId && directSecretAccessKey) {
        accessKeyId = directAccessKeyId;
        secretAccessKey = directSecretAccessKey;

        // Remove these properties from providerOptions
        providerOptions.value.properties = providerOptions.value.properties.filter(
          (prop) =>
            j.Property.check(prop) &&
            j.Identifier.check(prop.key) &&
            prop.key.name !== 'accessKeyId' &&
            prop.key.name !== 'secretAccessKey'
        );
      } else if (j.Property.check(s3Options) && j.ObjectExpression.check(s3Options.value)) {
        // Look inside s3Options
        accessKeyId = getPropertyByKeyName(j, s3Options.value, 'accessKeyId');
        secretAccessKey = getPropertyByKeyName(j, s3Options.value, 'secretAccessKey');
      }

      if (
        accessKeyId &&
        secretAccessKey &&
        j.Property.check(s3Options) &&
        j.ObjectExpression.check(s3Options.value)
      ) {
        // Create the credentials object
        const credentials = j.objectExpression([
          j.property('init', j.identifier('accessKeyId'), accessKeyId.value),
          j.property('init', j.identifier('secretAccessKey'), secretAccessKey.value),
        ]);

        // Remove the old properties from s3Options
        s3Options.value.properties = s3Options.value.properties.filter(
          (prop) =>
            j.Property.check(prop) &&
            j.Identifier.check(prop.key) &&
            prop.key.name !== 'accessKeyId' &&
            prop.key.name !== 'secretAccessKey'
        );

        // Add the new credentials object to s3Options
        s3Options.value.properties.push(
          j.property('init', j.identifier('credentials'), credentials)
        );
      }
    });

  return root.toSource();
};

export default transform;
