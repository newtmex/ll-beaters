import { useCallback, useMemo } from "react";
import {
  AssetDetailFragment,
  FetchOwnedAssetsQuery,
  OwnershipsOrderBy,
  Standard,
  useFetchOwnedAssetsQuery,
} from "../graphql";
import useAccount from "./liteflow/useAccount";
import useOrderByQuery from "./liteflow/useOrderByQuery";
import usePaginateQuery from "./liteflow/usePaginateQuery";
import { useScaffoldContractRead } from "./scaffold-eth";

let cachedData: FetchOwnedAssetsQuery | undefined;

export interface AssetLike {
  chainId: number;
  collectionAddress: string;
  tokenId: string;
  collection: {
    standard: Standard;
  };
  creator: {
    address: string;
  };
  owned: {
    quantity: string;
  } | null;
}

export const useOwnedNFTs = (group: "all" | "member" | "family" = "all") => {
  const { data: _memAddr } = useScaffoldContractRead({ contractName: "Beaters", functionName: "mem_addr" });
  const { data: _famAddr } = useScaffoldContractRead({ contractName: "Beaters", functionName: "fam_addr" });
  const memAddr = _memAddr?.toLowerCase();
  const famAddr = _famAddr?.toLowerCase();

  const { limit, offset } = usePaginateQuery();
  const orderBy = useOrderByQuery<OwnershipsOrderBy>("CREATED_AT_DESC");
  const { address } = useAccount();
  const userAddress = address || "";

  const now = new Date(Math.floor(Date.now() / 1000) * 1000);

  const { data, refetch, error } = useFetchOwnedAssetsQuery({
    variables: {
      address: userAddress,
      currentAddress: userAddress,
      limit,
      offset,
      orderBy,
      now,
    },
  });

  const nfts = useMemo(
    () =>
      (cachedData = data || cachedData)?.owned?.nodes.map(x => x.asset).filter((x): x is AssetDetailFragment => !!x),
    [data],
  );

  const collectionAddrFactor = useCallback(
    <Asset extends AssetLike>(asset: Asset) =>
      +asset.tokenId - (asset.collectionAddress == famAddr ? nfts?.length || 1 : 0),
    [famAddr, nfts],
  );

  return {
    error,
    refetch,
    memAddr,
    famAddr,
    nfts:
      group == "all"
        ? nfts?.sort((a, b) => collectionAddrFactor(a) - collectionAddrFactor(b))
        : nfts
            ?.filter(nft => nft.collectionAddress == (group == "family" ? famAddr : memAddr))
            .sort((a, b) => +a.tokenId - +b.tokenId),
  };
};
