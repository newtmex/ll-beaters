"use client";

import { WriteOnlyFunctionForm } from "./WriteOnlyFunctionForm";
import { AbiFunction } from "abitype";
import { useDeployedContractInfo } from "~~/hooks/scaffold-eth";

export const SelectWriteFunction = ({ name }: { name: string }) => {
  const { data: deployedContractData } = useDeployedContractInfo("Beaters");

  if (!deployedContractData) {
    return <div>Loading...</div>;
  }

  const functionToDisplay = (
    (deployedContractData?.abi).filter(part => part.type === "function") as AbiFunction[]
  ).filter(fn => fn.name == name)[0];

  return (
    <WriteOnlyFunctionForm
      abi={deployedContractData.abi}
      abiFunction={functionToDisplay}
      onChange={function (): void {
        console.log("changed");
      }}
      contractAddress={deployedContractData.address}
    />
  );
};
