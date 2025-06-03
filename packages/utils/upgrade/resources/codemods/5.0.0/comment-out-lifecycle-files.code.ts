import { Transform } from 'jscodeshift';

/**
 * comments out lifecycles.js/ts files and adds a description for the reason at the top
 */
const transform: Transform = (file, api) => {
  const j = api.jscodeshift;
  const root = j(file.source);

  // check if file path follows this pattern `content-types/[content-type-name]/lifecycles`
  if (/content-types\/[^/]+\/lifecycles\.(js|ts)$/.test(file.path)) {
    // Get the entire source code as a string
    const sourceCode = root.toSource();

    // Split the source code into lines and prepend // to each line
    // we are using line comments instead of block comments so we don't face issues with existing block comments
    const commentedCode = sourceCode
      .split('\n')
      .map((line) => `// ${line}`)
      .join('\n');

    // Add a header comment at the top to explain why the file is commented out
    const headerComment = `
/*
 *
 * ============================================================
 * WARNING: THIS FILE HAS BEEN COMMENTED OUT
 * ============================================================
 *
 * CONTEXT:
 *
 * The lifecycles.js file has been commented out to prevent unintended side effects when starting Strapi 5 for the first time after migrating to the document service.
 *
 * STRAPI 5 introduces a new document service that handles lifecycles differently compared to previous versions. Without migrating your lifecycles to document service middlewares, you may experience issues such as:
 *
 * - \`unpublish\` actions triggering \`delete\` lifecycles for every locale with a published entity, which differs from the expected behavior in v4.
 * - \`discardDraft\` actions triggering both \`create\` and \`delete\` lifecycles, leading to potential confusion.
 *
 * MIGRATION GUIDE:
 *
 * For a thorough guide on migrating your lifecycles to document service middlewares, please refer to the following link:
 * [Document Services Middlewares Migration Guide](https://docs.strapi.io/dev-docs/migration/v4-to-v5/breaking-changes/lifecycle-hooks-document-service)
 *
 * IMPORTANT:
 *
 * Simply uncommenting this file without following the migration guide may result in unexpected behavior and inconsistencies. Ensure that you have completed the migration process before re-enabling this file.
 *
 * ============================================================
 */
`;

    // Combine the header comment with the commented-out code
    const finalCode = `${headerComment}\n${commentedCode}`;

    return finalCode;
  }

  return root.toSource();
};

export const parser = 'tsx';

export default transform;
