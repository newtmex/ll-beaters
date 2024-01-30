import { ExternalProvider } from "@ethersproject/providers";
import { providers } from "ethers";
import type { WalletClient } from "wagmi";

/**
 * Hook returning the current signer logged in to the website. This signer can and should
 * be used to sign messages or transactions
 * @returns (Signer & TypedDataSigner) | undefined
 */

export function walletClientToSigner(walletClient: WalletClient): providers.JsonRpcSigner {
  const { account, transport } = walletClient;
  const provider = new providers.Web3Provider(transport as ExternalProvider);
  const signer = provider.getSigner(account.address);
  return signer;
}
