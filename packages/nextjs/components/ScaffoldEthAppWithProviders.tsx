"use client";

import { PropsWithChildren, useEffect, useMemo } from "react";
import { ApolloProvider } from "@apollo/client";
import { LiteflowProvider } from "@liteflow/react";
import { RainbowKitProvider, darkTheme, lightTheme } from "@rainbow-me/rainbowkit";
import { Toaster } from "react-hot-toast";
import { WagmiConfig } from "wagmi";
import getClient from "~~/client";
import { Footer } from "~~/components/Footer";
import { Header } from "~~/components/Header";
import { BlockieAvatar } from "~~/components/scaffold-eth";
import { ProgressBar } from "~~/components/scaffold-eth/ProgressBar";
import { Environment } from "~~/environment";
import useLfAccount from "~~/hooks/liteflow/useAccount";
import useEnvironment from "~~/hooks/liteflow/useEnvironment";
import { useNativeCurrencyPrice } from "~~/hooks/scaffold-eth";
import { useDarkMode } from "~~/hooks/scaffold-eth/useDarkMode";
import { EnvironmentContext } from "~~/services/environment";
import { useGlobalState } from "~~/services/store/store";
import { wagmiConfig } from "~~/services/web3/wagmiConfig";
import { appChains } from "~~/services/web3/wagmiConnectors";

function AccountProvider({ children, onError }: PropsWithChildren<{ onError: (code: number) => void }>) {
  const { LITEFLOW_API_KEY, BASE_URL } = useEnvironment();
  const { jwtToken } = useLfAccount();

  const client = useMemo(
    // The client needs to be reset when the jwtToken changes but only on the client as the server will
    // always have the same token and will rerender this app multiple times and needs to preserve the cache
    () => getClient(LITEFLOW_API_KEY, jwtToken, BASE_URL, typeof window !== "undefined", onError),
    [jwtToken, onError, LITEFLOW_API_KEY, BASE_URL],
  );

  return <ApolloProvider client={client}>{children}</ApolloProvider>;
}

const ScaffoldEthApp = ({ children }: { children: React.ReactNode }) => {
  const price = useNativeCurrencyPrice();
  const setNativeCurrencyPrice = useGlobalState(state => state.setNativeCurrencyPrice);

  useEffect(() => {
    if (price > 0) {
      setNativeCurrencyPrice(price);
    }
  }, [setNativeCurrencyPrice, price]);

  return (
    <>
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="relative flex flex-col flex-1">{children}</main>
        <Footer />
      </div>
      <Toaster />
    </>
  );
};

export const ScaffoldEthAppWithProviders = ({
  children,
  environment,
}: {
  children: React.ReactNode;
  environment: Environment;
}) => {
  const { isDarkMode } = useDarkMode();

  return (
    <EnvironmentContext.Provider value={environment}>
      <WagmiConfig config={wagmiConfig}>
        <ProgressBar />

        <LiteflowProvider apiKey={process.env.NEXT_PUBLIC_LITEFLOW_API_KEY || ""}>
          <RainbowKitProvider
            chains={appChains.chains}
            avatar={BlockieAvatar}
            theme={isDarkMode ? darkTheme() : lightTheme()}
          >
            <AccountProvider onError={console.error}>
              <ScaffoldEthApp>{children}</ScaffoldEthApp>
            </AccountProvider>
          </RainbowKitProvider>
        </LiteflowProvider>
      </WagmiConfig>
    </EnvironmentContext.Provider>
  );
};
