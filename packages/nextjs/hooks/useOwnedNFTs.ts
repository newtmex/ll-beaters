import { useMemo } from "react";
import { AssetDetailFragment, FetchOwnedAssetsQuery, OwnershipsOrderBy, useFetchOwnedAssetsQuery } from "../graphql";
import useAccount from "./liteflow/useAccount";
import useOrderByQuery from "./liteflow/useOrderByQuery";
import usePaginateQuery from "./liteflow/usePaginateQuery";

let cachedData: FetchOwnedAssetsQuery | undefined;

export const useOwnedNFTs = () => {
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

  return useMemo(
    () =>
      (cachedData = data || cachedData)?.owned?.nodes.map(x => x.asset).filter((x): x is AssetDetailFragment => !!x),
    [data],
  );
};
