import { Transform, JSCodeshift, Collection } from 'jscodeshift';

const transform: Transform = (file, api) => {
  const j = api.jscodeshift;

  const root = j(file.source);

  return root.toSource();
};

export const parser = 'tsx';

export default transform;
