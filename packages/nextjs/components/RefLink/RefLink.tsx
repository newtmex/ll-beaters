"use client";

import { useState } from "react";
import { refIdKey } from "./useReffererId";
import CopyToClipboard from "react-copy-to-clipboard";
import { useAccount } from "wagmi";
import { CheckCircleIcon, DocumentDuplicateIcon } from "@heroicons/react/24/outline";
import { useScaffoldContractRead } from "~~/hooks/scaffold-eth";

export const RefLink = ({ className }: { className?: string }) => {
  const [linkCopied, setLinkCopied] = useState(false);

  const { address } = useAccount();
  const { data: refId } = useScaffoldContractRead({
    contractName: "Beaters",
    functionName: "getRefId",
    args: [address],
    keepPreviousData: true,
  });

  const refLink = (typeof window == "undefined" ? "" : window.location.origin) + `?${refIdKey}=${refId}`;

  return !refId ? null : (
    <div className={`btn flex space-x-2 text-sm ${className}`}>
      {linkCopied ? (
        <div className="btn-sm !rounded-xl flex gap-3 py-3">
          <CheckCircleIcon className="text-xl font-normal h-6 w-4 cursor-pointer ml-2 sm:ml-0" aria-hidden="true" />
          <span className=" whitespace-nowrap">{refLink}</span>
        </div>
      ) : (
        <CopyToClipboard
          text={refLink}
          onCopy={() => {
            setLinkCopied(true);
            setTimeout(() => {
              setLinkCopied(false);
            }, 800);
          }}
        >
          <div className="btn-sm !rounded-xl flex gap-3 py-3">
            <DocumentDuplicateIcon
              className="text-xl font-normal h-6 w-4 cursor-pointer ml-2 sm:ml-0"
              aria-hidden="true"
            />
            <span className=" whitespace-nowrap">{refLink}</span>
          </div>
        </CopyToClipboard>
      )}
    </div>
  );
};
