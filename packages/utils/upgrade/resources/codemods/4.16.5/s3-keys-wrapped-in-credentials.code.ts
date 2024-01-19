import { Transform, ASTPath, Property, ArrowFunctionExpression } from 'jscodeshift';
import path from 'node:path';

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
  const root = j(file.source);

  root
    .find(j.ArrowFunctionExpression)
    .forEach((arrowFunctionPath: ASTPath<ArrowFunctionExpression>) => {
      const body = arrowFunctionPath.node.body;

      if (j.ObjectExpression.check(body)) {
        const uploadProperty = body.properties.find(
          (prop) =>
            j.Property.check(prop) && j.Identifier.check(prop.key) && prop.key.name === 'upload'
        );

        if (j.Property.check(uploadProperty) && j.ObjectExpression.check(uploadProperty.value)) {
          const configProperty = uploadProperty.value.properties.find(
            (prop) =>
              j.Property.check(prop) && j.Identifier.check(prop.key) && prop.key.name === 'config'
          );
          if (j.Property.check(configProperty) && j.ObjectExpression.check(configProperty.value)) {
            const providerProperty = configProperty.value.properties.find(
              (prop) =>
                j.Property.check(prop) &&
                j.Identifier.check(prop.key) &&
                prop.key.name === 'provider' &&
                j.Literal.check(prop.value) &&
                prop.value.value === 'aws-s3'
            );

            if (providerProperty) {
              const providerOptions = configProperty.value.properties.find(
                (prop) =>
                  j.Property.check(prop) &&
                  j.Identifier.check(prop.key) &&
                  prop.key.name === 'providerOptions'
              );

              if (
                j.Property.check(providerOptions) &&
                j.ObjectExpression.check(providerOptions.value)
              ) {
                let accessKeyId: Property | undefined;
                let secretAccessKey: Property | undefined;

                // Check for accessKeyId and secretAccessKey directly under providerOptions
                const directAccessKeyId = providerOptions.value.properties.find(
                  (prop) =>
                    j.Property.check(prop) &&
                    j.Identifier.check(prop.key) &&
                    prop.key.name === 'accessKeyId'
                ) as Property;
                const directSecretAccessKey = providerOptions.value.properties.find(
                  (prop) =>
                    j.Property.check(prop) &&
                    j.Identifier.check(prop.key) &&
                    prop.key.name === 'secretAccessKey'
                ) as Property;

                let s3Options = providerOptions.value.properties.find(
                  (prop) =>
                    j.Property.check(prop) &&
                    j.Identifier.check(prop.key) &&
                    prop.key.name === 's3Options'
                );

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
                } else if (
                  j.Property.check(s3Options) &&
                  j.ObjectExpression.check(s3Options.value)
                ) {
                  // Look inside s3Options
                  accessKeyId = s3Options.value.properties.find(
                    (prop) =>
                      j.Property.check(prop) &&
                      j.Identifier.check(prop.key) &&
                      prop.key.name === 'accessKeyId'
                  ) as Property;

                  secretAccessKey = s3Options.value.properties.find(
                    (prop) =>
                      j.Property.check(prop) &&
                      j.Identifier.check(prop.key) &&
                      prop.key.name === 'secretAccessKey'
                  ) as Property;
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
              }
            }
          }
        }
      }
    });

  return root.toSource();
};

export default transform;
