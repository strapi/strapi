import { withFieldLabelAction } from './FieldLabelAction';

type Field = { name: string; labelAction?: React.ReactNode };
type Args = { layout: { layout: Field[][][] } };

/**
 * Adds the provenance label action to the top-level fields of API content types. Fields of
 * components are left alone: a component is tracked as one field.
 */
export const mutateEditViewHook = <TArgs extends Args>(args: TArgs): TArgs => {
  // The hook does not receive the content type: the edit view URL carries it
  const model = decodeURIComponent(
    window.location.pathname.match(/\/(?:collection|single)-types\/([^/]+)/)?.[1] ?? ''
  );

  // Content History renders the same layout and expects i18n's own label action element
  if (!model.startsWith('api::') || window.location.pathname.includes('/history')) {
    return args;
  }

  return {
    ...args,
    layout: {
      ...args.layout,
      layout: args.layout.layout.map((panel) =>
        panel.map((row) =>
          row.map((field) => ({
            ...field,
            labelAction: withFieldLabelAction(field.name, field.labelAction),
          }))
        )
      ),
    },
  };
};
