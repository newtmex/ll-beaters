import { parseEther } from "viem";
import { useDeployedContractInfo, useScaffoldContractWrite } from "~~/hooks/scaffold-eth";

export const useApproveSpendBeat = ({ beatAmt }: { beatAmt: string }) => {
  const { data: beatersData } = useDeployedContractInfo("Beaters");

  const { writeAsync: approveSpend, isLoading: approveSpendIsLoading } = useScaffoldContractWrite({
    contractName: "Beat",
    functionName: "approve",
    args: [beatersData?.address, parseEther(beatAmt)],
  });

  return { approveSpend, approveSpendIsLoading };
};
