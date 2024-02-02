import { useApproveSpendBeat } from "../../hooks";
import { formatEther } from "viem";
import { useAccount, useNetwork } from "wagmi";
import { useScaffoldContractRead, useScaffoldContractWrite } from "~~/hooks/scaffold-eth";
import { useTargetNetwork } from "~~/hooks/scaffold-eth/useTargetNetwork";
import { getParsedError, notification } from "~~/utils/scaffold-eth";

const MintFamily = () => {
  const { chain } = useNetwork();
  const { targetNetwork } = useTargetNetwork();

  const writeDisabled = !chain || chain?.id !== targetNetwork.id;

  const { address } = useAccount();

  const { data: famMintCost } = useScaffoldContractRead({ contractName: "Beaters", functionName: "famMintCost" });
  const { data: beatBal } = useScaffoldContractRead({
    contractName: "Beat",
    functionName: "balanceOf",
    args: [address],
  });

  const { approveSpend, approveSpendIsLoading } = useApproveSpendBeat({ beatAmt: formatEther(famMintCost || 0n) });
  const { writeAsync: mintFamily, isLoading: mintFamilyIsLoading } = useScaffoldContractWrite({
    contractName: "Beaters",
    functionName: "mintFamily",
  });

  const isLoading = mintFamilyIsLoading || approveSpendIsLoading;

  const handleWrite = async () => {
    try {
      await approveSpend();
      await mintFamily();
    } catch (e: any) {
      const message = getParsedError(e);
      notification.error(message);
    }
  };

  if (beatBal == undefined || famMintCost == undefined) {
    return <>Loading..</>;
  }

  return (
    <>
      Mint Family Cost: {formatEther(famMintCost)}
      <br />
      Beat Bal: {formatEther(beatBal)}
      <br />
      <div
        className={`flex ${
          writeDisabled &&
          "tooltip before:content-[attr(data-tip)] before:right-[-10px] before:left-auto before:transform-none"
        }`}
        data-tip={`${writeDisabled && "Wallet not connected or in the wrong network"}`}
      >
        <button className="btn btn-secondary btn-sm" disabled={writeDisabled || isLoading} onClick={handleWrite}>
          {isLoading && <span className="loading loading-spinner loading-xs"></span>}
          Mint Family 💸
        </button>
      </div>
    </>
  );
};

export default MintFamily;
