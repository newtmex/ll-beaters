import { parseEther } from "viem";
import { useAccount } from "wagmi";
import { useDeployedContractInfo, useScaffoldContractRead, useScaffoldContractWrite } from "~~/hooks/scaffold-eth";

export const useApproveSpendBeat = ({ beatAmt }: { beatAmt: string }) => {
  const { data: beatersData } = useDeployedContractInfo("Beaters");

  const { writeAsync: approveSpend, isLoading: approveSpendIsLoading } = useScaffoldContractWrite({
    contractName: "Beat",
    functionName: "approve",
    args: [beatersData?.address, parseEther(beatAmt)],
  });

  return { approveSpend, approveSpendIsLoading };
};

export const useBeatBalance = () => {
  const { address } = useAccount();

  return useScaffoldContractRead({
    contractName: "Beat",
    functionName: "balanceOf",
    args: [address],
  });
};
