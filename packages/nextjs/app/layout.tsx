import { Suspense } from "react";
import "@rainbow-me/rainbowkit/styles.css";
import { Metadata } from "next";
import { ScaffoldEthAppWithProviders } from "~~/components/ScaffoldEthAppWithProviders";
import getEnvironment from "~~/environment";
import "~~/styles/globals.css";

const baseUrl = process.env.NEXT_PUBLIC_VERCEL_URL
  ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
  : `http://localhost:${process.env.PORT}`;

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "LL-Beaters App",
    template: "%s | LL-Beaters",
  },
  description: "Built with 🏗 Scaffold-ETH 2",

  icons: {
    icon: [{ url: "/favicon.png", sizes: "32x32", type: "image/png" }],
  },
};

const ScaffoldEthApp = async ({ children }: { children: React.ReactNode }) => {
  const environment = await getEnvironment();
  return (
    <html>
      <body>
        <Suspense>
          <ScaffoldEthAppWithProviders environment={environment}>{children}</ScaffoldEthAppWithProviders>
        </Suspense>
      </body>
    </html>
  );
};

export default ScaffoldEthApp;
