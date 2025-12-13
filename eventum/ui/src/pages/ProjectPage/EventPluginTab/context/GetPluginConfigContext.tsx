import { createContext } from 'react';

import { EventPluginNamedConfig } from '@/api/routes/generator-configs/schemas/plugins/event';

export interface GetPluginConfigContextValue {
  getPluginConfig: () => EventPluginNamedConfig;
}

const GetPluginConfigContext = createContext<
  GetPluginConfigContextValue | undefined
>(undefined);

interface GetPluginConfigProviderProps {
  children: React.ReactNode;
  getPluginConfig: () => EventPluginNamedConfig;
}

export const GetPluginConfigProvider = ({
  children,
  getPluginConfig,
}: GetPluginConfigProviderProps) => {
  return (
    <GetPluginConfigContext.Provider
      value={{ getPluginConfig: getPluginConfig }}
    >
      {children}
    </GetPluginConfigContext.Provider>
  );
};

export default GetPluginConfigContext;
