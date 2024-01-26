"use client";

import { useState } from "react";
import { useApproveSpendBeat } from "../hooks";
import { formatEther, parseEther } from "viem";
import { useAccount, useNetwork } from "wagmi";
import { IntegerInput } from "~~/components/scaffold-eth";
import { useScaffoldContractRead, useScaffoldContractWrite } from "~~/hooks/scaffold-eth";
import { useTargetNetwork } from "~~/hooks/scaffold-eth/useTargetNetwork";
import { getParsedError, notification } from "~~/utils/scaffold-eth";

const WidthdrawStake = () => {
  const { address: connectedAddress } = useAccount();
  const { chain } = useNetwork();
  const { targetNetwork } = useTargetNetwork();
  const writeDisabled = !chain || chain?.id !== targetNetwork.id;
  const [beatAmt, setBeatAmt] = useState("0");

  const { data: beatBal } = useScaffoldContractRead({
    contractName: "Beat",
    functionName: "balanceOf",
    args: [connectedAddress],
  });

  const { approveSpend, approveSpendIsLoading } = useApproveSpendBeat({ beatAmt });

  const { writeAsync: widthdrawStake, isLoading: widthdrawStakeIsLoading } = useScaffoldContractWrite({
    contractName: "Beaters",
    functionName: "widthdrawStake",
    args: [parseEther(beatAmt)],
  });

  const isLoading = widthdrawStakeIsLoading || approveSpendIsLoading;

  const handleWrite = async () => {
    try {
      await approveSpend();
      await widthdrawStake();
    } catch (e: any) {
      const message = getParsedError(e);
      notification.error(message);
    }
  };

  return (
    <>
      Beat Bal: {formatEther(beatBal || 0n)}
      <IntegerInput
        value={beatAmt}
        onChange={function (newValue): void {
          setBeatAmt(newValue.toString());
        }}
        placeholder="Beat Amount"
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
          Widthdraw Stake 💸
        </button>
      </div>
    </>
  );
};

export default WidthdrawStake;
