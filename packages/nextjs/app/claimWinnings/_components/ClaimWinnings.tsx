"use client";

import { useMemo, useState } from "react";
import { formatEther } from "viem";
import { useNetwork } from "wagmi";
import { useBeatBalance } from "~~/hooks";
import { useScaffoldContractWrite } from "~~/hooks/scaffold-eth";
import { useTargetNetwork } from "~~/hooks/scaffold-eth/useTargetNetwork";
import { useOwnedNFTs } from "~~/hooks/useOwnedNFTs";
import { getParsedError, notification } from "~~/utils/scaffold-eth";

type Group = "family" | "member";

const ClaimWinnings = () => {
  const [claimData, setClaimData] = useState<{ tokenId: string; group: Group }>();
  const tokenId = useMemo(() => claimData && BigInt(claimData.tokenId), [claimData]);
  const group = useMemo(() => claimData?.group, [claimData?.group]);

  const { chain } = useNetwork();
  const { targetNetwork } = useTargetNetwork();

  const writeDisabled = !chain || chain?.id !== targetNetwork.id;

  const { writeAsync: claimFamilyWinnings, isLoading: claimFamilyWinningsIsLoading } = useScaffoldContractWrite({
    contractName: "Beaters",
    functionName: "claimFamilyWinnings",
    args: [tokenId],
  });
  const { writeAsync: claimMemberWinnings, isLoading: claimMemberWinningsIsLoading } = useScaffoldContractWrite({
    contractName: "Beaters",
    functionName: "claimMemberWinnings",
    args: [tokenId],
  });

  const { data: beatBal, refetch: refetchBeatBal } = useBeatBalance();

  const handleWrite = async () => {
    try {
      await (group == "family" ? claimFamilyWinnings() : claimMemberWinnings());
      refetchBeatBal();
    } catch (e: any) {
      const message = getParsedError(e);
      notification.error(message);
    }
  };

  const { nfts: ownedMembers, error: nftsError } = useOwnedNFTs("member");
  const { nfts: ownedFamilies } = useOwnedNFTs("family");

  const Display = ({ lGroup }: { lGroup: Group }) => {
    const [title, selection, nfts, isLoading] =
      lGroup == "family"
        ? ["claimFamilyWinnings", "FamID", ownedFamilies, claimFamilyWinningsIsLoading]
        : ["claimMemberWinnings", "MemID", ownedMembers, claimMemberWinningsIsLoading];

    return (
      <div className="flex flex-col bg-base-100 px-10 py-10 text-center items-center max-w-xs rounded-3xl">
        <div className="py-5 space-y-3 first:pt-0 last:pb-1">
          <h2>{title}</h2>
          <div className="flex items-center">
            {selection}:{" "}
            <select
              className="select w-full max-w-xs"
              onChange={e => {
                const ownedNft = nfts?.at(e.target.selectedIndex - 1);
                ownedNft && setClaimData({ group: lGroup, tokenId: ownedNft.tokenId });
              }}
            >
              {nfts && [
                <option key={`${selection}-claim`} disabled selected={group != lGroup}>
                  Select {selection}
                </option>,
                ...nfts.map(ownedNft => (
                  <option
                    selected={group == lGroup && tokenId?.toString() == ownedNft.tokenId}
                    key={`${selection}-claim${ownedNft.tokenId}`}
                  >
                    {ownedNft.tokenId}
                  </option>
                )),
              ]}
            </select>
          </div>

          <div
            className={`flex ${
              writeDisabled &&
              "tooltip before:content-[attr(data-tip)] before:right-[-10px] before:left-auto before:transform-none"
            }`}
            data-tip={`${writeDisabled && "Wallet not connected or in the wrong network"}`}
          >
            <button className="btn btn-secondary btn-sm" disabled={writeDisabled || isLoading} onClick={handleWrite}>
              {isLoading && <span className="loading loading-spinner loading-xs"></span>}
              Claim Winnings💸
            </button>
          </div>
        </div>
      </div>
    );
  };
  const isLoading = !ownedFamilies || !ownedMembers;

  if (isLoading) {
    if (nftsError) {
      return <>{nftsError.message}</>;
    }

    return <>Loading..</>;
  }

  if (!ownedFamilies.length && !ownedMembers.length) {
    return <>Nothing to claim. Stake ETH, Mint Family or Buy any of them from the Market Place</>;
  }

  return (
    <>
      Beat Bal: {formatEther(beatBal || 0n)}
      {!!ownedMembers.length && <Display lGroup="member" key="mem-display" />}
      {!!ownedFamilies.length && <Display lGroup="family" key="fam-display" />}
    </>
  );
};

export default ClaimWinnings;
