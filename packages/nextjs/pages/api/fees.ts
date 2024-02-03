import { CalculateOrderFeeResult, parseAndVerifyRequest } from "@nft/service";
import { NextApiRequest, NextApiResponse } from "next";
import invariant from "ts-invariant";
import { createPublicClient, http, isAddress, zeroAddress } from "viem";
import scaffoldConfig from "~~/scaffold.config";
import { Contract, contracts } from "~~/utils/scaffold-eth/contract";

const chain = scaffoldConfig.targetNetworks[0];

invariant(process.env.LITEFLOW_SERVICE_SECRET, "LiteFlow Service Secrete not set");
const liteFlowServiceSecret = process.env.LITEFLOW_SERVICE_SECRET;

const publicClient = createPublicClient({
  chain,
  transport: http(`${chain.rpcUrls.public.http[0]}`),
});

const feeCollector = "0xE05618ab90f0DA525200D340e8A74223Dd280f3F".toLowerCase();

export default async function fees(req: NextApiRequest, res: NextApiResponse<CalculateOrderFeeResult>): Promise<void> {
  const { currentUser } = await parseAndVerifyRequest<"CALCULATE_ORDER_FEES">(req, liteFlowServiceSecret);
  const beatersConfig = contracts?.[chain.id]?.["Beaters"] as Contract<"Beaters">;
  invariant(beatersConfig, "No deployed Beaters contracts");

  const refAddress =
    currentUser &&
    (await publicClient.readContract({
      ...beatersConfig,
      functionName: "referrerAddress",
      args: [currentUser],
    }));

  const fees =
    refAddress && isAddress(refAddress) && zeroAddress != refAddress
      ? [
          { account: refAddress, value: "300" },
          { account: feeCollector, value: "200" },
        ]
      : [{ account: feeCollector, value: "500" }];

  res.status(200).json(fees);
}

export const config = {
  api: {
    bodyParser: false,
  },
};
