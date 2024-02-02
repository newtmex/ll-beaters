import { useState } from "react";
import { parseEther } from "viem";
import { useNetwork } from "wagmi";
import { EtherInput } from "~~/components/scaffold-eth";
import { useScaffoldContractWrite } from "~~/hooks/scaffold-eth";
import { useTargetNetwork } from "~~/hooks/scaffold-eth/useTargetNetwork";
import { useFamilies } from "~~/hooks/useFamilies";
import { useOwnedNFTs } from "~~/hooks/useOwnedNFTs";
import { getParsedError, notification } from "~~/utils/scaffold-eth";

const AddStake = () => {
  const [addStakeData, _] = useState({
    memId: "0",
    famId: "0",
    refId: "0",
    value: "0",
  });
  const setAddStakeData = (key: keyof typeof addStakeData, value: string) => {
    _(v => {
      v[key] = value;
      return Object.assign({}, v);
    });
  };

  const { chain } = useNetwork();
  const { targetNetwork } = useTargetNetwork();

  const writeDisabled = !chain || chain?.id !== targetNetwork.id;

  const { writeAsync: addStake, isLoading: addStakeIsLoading } = useScaffoldContractWrite({
    contractName: "Beaters",
    functionName: "addStake",
    args: [BigInt(addStakeData.memId), BigInt(addStakeData.famId), BigInt(addStakeData.refId)],
    value: parseEther(addStakeData.value),
  });

  const handleWrite = async () => {
    try {
      await addStake();
    } catch (e: any) {
      const message = getParsedError(e);
      notification.error(message);
    }
  };

  const ownedMembers = useOwnedNFTs();
  const families = useFamilies();

  const isLoading = !ownedMembers || !families || addStakeIsLoading;

  if (isLoading) {
    return <>Loading..</>;
  }

  return (
    <>
      <h2>Add Stake</h2>
      <div className="flex items-center">
        MemID:{" "}
        {!ownedMembers?.length ? (
          addStakeData.memId
        ) : (
          <select className="select w-full max-w-xs">
            {[{ tokenId: "0" }, ...ownedMembers].map(ownedMember => (
              <option
                selected={addStakeData.memId == ownedMember.tokenId}
                onClick={() => {
                  setAddStakeData("memId", ownedMember.tokenId);
                }}
                key={`mem-add${ownedMember.tokenId}`}
              >
                {ownedMember.tokenId}
              </option>
            ))}
          </select>
        )}
      </div>
      <div className="flex items-center">
        FamID:{" "}
        <select className="select w-full max-w-xs">
          {families?.map(family => (
            <option
              selected={family.tokenId == addStakeData.famId}
              onClick={() => {
                setAddStakeData("famId", family.tokenId);
              }}
              key={`fam-add${family.tokenId}`}
            >
              {family.tokenId}
            </option>
          ))}
        </select>
      </div>

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
