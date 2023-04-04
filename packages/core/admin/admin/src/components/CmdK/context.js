import { createContext, useContext } from 'react';

const CommandContext = createContext(undefined);
const useCommand = () => useContext(CommandContext);

export { CommandContext, useCommand };
