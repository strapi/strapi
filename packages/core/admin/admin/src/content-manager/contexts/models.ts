import * as React from 'react';

const ModelsContext = React.createContext<{
  refetchData: () => Promise<void>;
}>({
  refetchData: () => Promise.resolve(),
});

export { ModelsContext };
