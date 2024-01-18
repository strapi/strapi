import { Transform, ASTPath, Property } from 'jscodeshift';
import path from 'node:path';

/**
 *  This codemod only affects users that are using the `aws-s3` provider.
 *  It will wrap the `accessKeyId` and `secretAccessKey` properties inside a `credentials` object.
 */
const transform: Transform = (file, api) => {
  // Check if the current file is 'config/plugins.js'
  const cwd = process.cwd();
  const pluginsPath = path.join(cwd, 'config/plugins.js');

  if (file.path !== pluginsPath) {
    return file.source;
  }

  const { j } = api;
  const root = j(file.source);

  root.find(j.ArrowFunctionExpression).forEach((arrowFunctionPath: ASTPath<any>) => {
    const body = arrowFunctionPath.node.body;

    if (body.type === 'ObjectExpression') {
      const uploadProperty = body.properties.find(
        (prop: Property) => prop.key.type === 'Identifier' && prop.key.name === 'upload'
      );

      if (uploadProperty && uploadProperty.value.type === 'ObjectExpression') {
        const configProperty = uploadProperty.value.properties.find(
          (prop: Property) => prop.key.type === 'Identifier' && prop.key.name === 'config'
        );

        if (configProperty && configProperty.value.type === 'ObjectExpression') {
          const providerProperty = configProperty.value.properties.find(
            (prop: Property) =>
              prop.key.type === 'Identifier' &&
              prop.key.name === 'provider' &&
              prop.value.type === 'Literal' &&
              prop.value.value === 'aws-s3'
          );

          if (providerProperty) {
            const providerOptions = configProperty.value.properties.find(
              (prop: Property) =>
                prop.key.type === 'Identifier' && prop.key.name === 'providerOptions'
            );

            if (providerOptions && providerOptions.value.type === 'ObjectExpression') {
              let accessKeyId: Property | undefined;
              let secretAccessKey: Property | undefined;

              // Check for accessKeyId and secretAccessKey directly under providerOptions
              const directAccessKeyId = providerOptions.value.properties.find(
                (prop: Property) =>
                  prop.key.type === 'Identifier' && prop.key.name === 'accessKeyId'
              );
              const directSecretAccessKey = providerOptions.value.properties.find(
                (prop: Property) =>
                  prop.key.type === 'Identifier' && prop.key.name === 'secretAccessKey'
              );

              let s3Options = providerOptions.value.properties.find(
                (prop: Property) => prop.key.type === 'Identifier' && prop.key.name === 's3Options'
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
                  (prop: Property) =>
                    prop.key.type === 'Identifier' &&
                    prop.key.name !== 'accessKeyId' &&
                    prop.key.name !== 'secretAccessKey'
                );
              } else if (s3Options.value.type === 'ObjectExpression') {
                // Look inside s3Options
                accessKeyId = s3Options.value.properties.find(
                  (prop: Property) =>
                    prop.key.type === 'Identifier' && prop.key.name === 'accessKeyId'
                );
                secretAccessKey = s3Options.value.properties.find(
                  (prop: Property) =>
                    prop.key.type === 'Identifier' && prop.key.name === 'secretAccessKey'
                );
              }

              if (accessKeyId && secretAccessKey && s3Options.value.type === 'ObjectExpression') {
                // Create the credentials object
                const credentials = j.objectExpression([
                  j.property('init', j.identifier('accessKeyId'), accessKeyId.value),
                  j.property('init', j.identifier('secretAccessKey'), secretAccessKey.value),
                ]);

                // Remove the old properties from s3Options
                s3Options.value.properties = s3Options.value.properties.filter(
                  (prop: Property) =>
                    prop.key.type === 'Identifier' &&
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
