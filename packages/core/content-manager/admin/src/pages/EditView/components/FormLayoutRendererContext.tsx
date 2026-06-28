import * as React from 'react';

import type { UseDocument } from '../../../hooks/useDocument';
import type { EditLayout } from '../../../hooks/useDocumentLayout';

type FormLayoutRendererProps = Pick<EditLayout, 'layout'> & {
  hasBackground?: boolean;
  document: ReturnType<UseDocument>;
};

type FormLayoutRenderer = React.ComponentType<FormLayoutRendererProps>;

const FormLayoutRendererContext = React.createContext<FormLayoutRenderer | null>(null);

const FormLayoutRendererProvider = ({
  renderer,
  children,
}: {
  renderer: FormLayoutRenderer;
  children: React.ReactNode;
}) => {
  return (
    <FormLayoutRendererContext.Provider value={renderer}>
      {children}
    </FormLayoutRendererContext.Provider>
  );
};

const useFormLayoutRenderer = () => {
  const renderer = React.useContext(FormLayoutRendererContext);

  if (renderer === null) {
    throw new Error('useFormLayoutRenderer must be used within a FormLayoutRendererProvider');
  }

  return renderer;
};

export { FormLayoutRendererProvider, useFormLayoutRenderer };
export type { FormLayoutRendererProps };
