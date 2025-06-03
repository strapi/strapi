import type { Transform } from 'jscodeshift';
import { relative } from 'node:path';

const transform: Transform = (file, api) => {
  const j = api.jscodeshift;
  const root = j.withParser('JSX')(file.source);

  const isReactFile = file.path.endsWith('.jsx') || file.path.endsWith('.tsx');

  if (!isReactFile) {
    return root.toSource();
  }

  const fileName = relative(process.cwd(), file.path);

  console.log(`Found React file: ${fileName}`);

  const buttons = root.findJSXElements('Button');

  console.log(`Found ${buttons.length} buttons in ${fileName}`);

  buttons.forEach((button) => {
    const { openingElement } = button.node;
    const isDisabled = openingElement.attributes.some(
      (attribute) => j.JSXAttribute.check(attribute) && attribute.name.name === 'disabled'
    );

    console.log(`Is disabled? ${isDisabled}`);

    if (!isDisabled) {
      openingElement.attributes.push(
        j.jsxAttribute(j.jsxIdentifier('disabled'), j.jsxExpressionContainer(j.literal(true)))
      );

      console.log('Added the disabled attribute');
    }
  });

  return root.toSource();
};

export default transform;
