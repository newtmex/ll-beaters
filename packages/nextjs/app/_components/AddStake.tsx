"use client";

import { useMemo, useState } from "react";
import { formatEther, parseEther } from "viem";
import { useNetwork } from "wagmi";
import { useReferrerId } from "~~/components/RefLink/useReffererId";
import { EtherInput } from "~~/components/scaffold-eth";
import { useApproveSpendBeat, useBeatBalance } from "~~/hooks";
import { useScaffoldContractRead, useScaffoldContractWrite } from "~~/hooks/scaffold-eth";
import { useTargetNetwork } from "~~/hooks/scaffold-eth/useTargetNetwork";
import { useFamilies } from "~~/hooks/useFamilies";
import { useOwnedNFTs } from "~~/hooks/useOwnedNFTs";
import { getParsedError, notification } from "~~/utils/scaffold-eth";

const AddStake = () => {
  const refId = useReferrerId();
  const [addStakeData, _] = useState({
    memId: "0",
    famId: "0",
    refId: refId || "0",
    value: "0",
  });
  const setAddStakeData = (key: keyof typeof addStakeData, value: string) => {
    _(v => {
      v[key] = value;
      return Object.assign({}, v);
    });
  };
  const { data: selectedMem } = useScaffoldContractRead({
    contractName: "Beaters",
    functionName: "memberProps",
    args: [addStakeData.memId !== "0" ? BigInt(addStakeData.memId) : undefined],
  });
  const { data: selectedFam } = useScaffoldContractRead({
    contractName: "Beaters",
    functionName: "familyProps",
    args: [BigInt(addStakeData.famId)],
  });
  const isSwitchingFam = useMemo(
    () => !!selectedFam && !!selectedMem && selectedMem.famId != selectedFam.id,
    [selectedFam, selectedMem],
  );

  const { chain } = useNetwork();
  const { targetNetwork } = useTargetNetwork();

  const writeDisabled = !chain || chain?.id !== targetNetwork.id;

  const { data: famSwitchCost } = useScaffoldContractRead({
    contractName: "Beaters",
    functionName: "famSwitchCost",
  });
  const { data: beatBal, refetch: refetchBeatBal } = useBeatBalance();

  const { approveSpend, approveSpendIsLoading } = useApproveSpendBeat({ beatAmt: formatEther(famSwitchCost || 0n) });
  const { writeAsync: addStake, isLoading: addStakeIsLoading } = useScaffoldContractWrite({
    contractName: "Beaters",
    functionName: "addStake",
    args: [BigInt(addStakeData.memId), BigInt(addStakeData.famId), BigInt(addStakeData.refId)],
    value: parseEther(addStakeData.value),
  });

  const { nfts: ownedMembers, refetch: refectOwnedNFTs } = useOwnedNFTs("member");
  const families = useFamilies();

  const handleWrite = async () => {
    try {
      isSwitchingFam && (await approveSpend());
      await addStake();
      isSwitchingFam && refetchBeatBal();
      refectOwnedNFTs();
    } catch (e: any) {
      const message = getParsedError(e);
      notification.error(message);
    }
  };
  const isLoading = approveSpendIsLoading || addStakeIsLoading;

  return (
    <>
      <h2>Add Stake</h2>
      <div className="flex items-center">
        MemID:{" "}
        {!ownedMembers?.length ? (
          addStakeData.memId
        ) : (
          <select
            className="select w-full max-w-xs"
            onChange={e => {
              const ownedMember = ownedMembers.at(e.target.selectedIndex);
              if (ownedMember) {
                setAddStakeData("memId", ownedMember.tokenId);
              }
            }}
          >
            {[{ tokenId: "0" }, ...ownedMembers].map(ownedMember => (
              <option selected={addStakeData.memId == ownedMember.tokenId} key={`mem-add${ownedMember.tokenId}`}>
                {ownedMember.tokenId}
              </option>
            ))}
          </select>
        )}
      </div>
      <div className="flex items-center">
        FamID:{" "}
        <select
          className="select w-full max-w-xs"
          onChange={e => {
            const family = families?.at(e.target.selectedIndex);
            family && setAddStakeData("famId", family.tokenId);
          }}
        >
          {families?.map(family => (
            <option selected={family.tokenId == addStakeData.famId} key={`fam-add${family.tokenId}`}>
              {family.tokenId}
            </option>
          ))}
        </select>
      </div>

      {isSwitchingFam && (
        <div className="flex items-center">
          Family Switch Cost: {formatEther(famSwitchCost || 0n)}
          <br />
          Beat Bal: {formatEther(beatBal || 0n)}
        </div>
      )}

      <EtherInput
        value={addStakeData.value}
        onChange={(newValue: string) => {
          setAddStakeData("value", newValue);
        }}
        usdMode
      />

      <div
        className={`flex ${
          writeDisabled &&
          "tooltip before:content-[attr(data-tip)] before:right-[-10px] before:left-auto before:transform-none"
        }`}
        data-tip={`${writeDisabled && "Wallet not connected or in the wrong network"}`}
      >
        <button className="btn btn-secondary btn-sm" disabled={writeDisabled || isLoading} onClick={handleWrite}>
          {isLoading && <span className="loading loading-spinner loading-xs"></span>}
          Stake 💸
        </button>
      </div>
    </>
  );
};

export default AddStake;
