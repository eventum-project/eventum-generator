import { useContext } from 'react';

import GetPluginConfigContext, {
  GetPluginConfigContextValue,
} from '../context/GetPluginConfigContext';

export const useGetPluginConfig = (): GetPluginConfigContextValue => {
  const context = useContext(GetPluginConfigContext);

  if (!context) {
    throw new Error(
      'useGetPluginConfig must be used within a GetPluginConfigProvider'
    );
  }

  return context;
};
