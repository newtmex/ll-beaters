import { useMemo } from "react";
import { AssetDetailFragment, FetchOwnedAssetsQuery, OwnershipsOrderBy, useFetchOwnedAssetsQuery } from "../graphql";
import useAccount from "./liteflow/useAccount";
import useOrderByQuery from "./liteflow/useOrderByQuery";
import usePaginateQuery from "./liteflow/usePaginateQuery";
import { useScaffoldContractRead } from "./scaffold-eth";

let cachedData: FetchOwnedAssetsQuery | undefined;

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

  const { data } = useFetchOwnedAssetsQuery({
    variables: {
      address: userAddress,
      currentAddress: address || "",
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

  return group == "all"
    ? nfts
    : nfts
        ?.filter(nft => nft.collectionAddress == (group == "family" ? famAddr : memAddr))
        .sort((a, b) => +a.tokenId - +b.tokenId);
};
