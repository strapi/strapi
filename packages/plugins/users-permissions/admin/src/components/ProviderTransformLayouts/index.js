import { createContext, useContext } from 'react';

const ProviderTransformLayouts = createContext({});

export const useTransformLayouts = () => useContext(ProviderTransformLayouts);

export default ProviderTransformLayouts.Provider;
