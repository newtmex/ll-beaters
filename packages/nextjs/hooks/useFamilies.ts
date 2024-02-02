import { useMemo } from "react";
import { AssetsOrderBy, useFetchCollectionQuery } from "../graphql";
import useOrderByQuery from "./liteflow/useOrderByQuery";
import usePaginateQuery from "./liteflow/usePaginateQuery";
import { useScaffoldContractRead } from "./scaffold-eth";
import { useNetwork } from "wagmi";

export const useFamilies = () => {
  const { chain } = useNetwork();
  const chainId = chain?.id || 0;

  const { limit, offset } = usePaginateQuery();
  const orderBy = useOrderByQuery<AssetsOrderBy>("CREATED_AT_DESC");

  const { data: _famAddr } = useScaffoldContractRead({
    contractName: "Beaters",
    functionName: "fam_addr",
  });
  const famAddr = _famAddr?.toLocaleLowerCase();

  const { data } = useFetchCollectionQuery({
    variables: {
      collectionAddress: famAddr || "",
      limit,
      offset,
      orderBy,
      chainId: chainId,
    },
  });

  return useMemo(() => data?.assets?.nodes, [data]);
};
