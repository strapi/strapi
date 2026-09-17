import * as React from 'react';

import type { EditFieldLayout } from '../../../hooks/useDocumentLayout';

/**
 * Extension point: plugins can wrap the rendered input of every edit-view
 * field with their own component (e.g. an "inherited value" veil a delivery
 * channel lays over untouched fields). The decorator receives the field
 * description and the rendered input as children; it decides per field
 * whether to add anything, and MUST render its children.
 *
 * Registration happens during a plugin's `register(app)` / `bootstrap(app)`,
 * which always runs before the admin shell renders, so plain module state is
 * enough (same rationale as `navAddons.ts`).
 */

type DecoratedFieldDescription = Omit<EditFieldLayout, 'size'> & { size?: number };

interface FieldDecoratorProps {
  field: DecoratedFieldDescription;
  children: React.ReactNode;
}

interface FieldDecorator {
  id: string;
  Component: React.ComponentType<FieldDecoratorProps>;
}

const decorators: FieldDecorator[] = [];

export const registerFieldDecorator = (decorator: FieldDecorator) => {
  const index = decorators.findIndex((item) => item.id === decorator.id);
  if (index === -1) {
    decorators.push(decorator);
  } else {
    decorators[index] = decorator;
  }
};

/** Wraps a field's input with every registered decorator (registration order, outermost last). */
export const DecoratedField = ({ field, children }: FieldDecoratorProps) => {
  return decorators.reduceRight(
    (node, { id, Component }) => (
      <Component key={id} field={field}>
        {node}
      </Component>
    ),
    <>{children}</>
  );
};

export type { FieldDecorator, FieldDecoratorProps, DecoratedFieldDescription };
