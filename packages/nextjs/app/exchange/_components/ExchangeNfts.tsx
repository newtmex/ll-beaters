"use client";

import React, { useMemo, useState } from "react";
import { toAddress } from "@liteflow/core";
import { AcceptOfferStep, CreateOfferStep, useAcceptOffer, useCreateOffer } from "@liteflow/react";
import { BigNumber } from "ethers";
import { formatEther } from "viem";
import { useAccount } from "wagmi";
import { IntegerInput } from "~~/components/scaffold-eth";
import { AssetDetailFragment, FetchOnSaleAssetsQuery, OffersOrderBy, useFetchOnSaleAssetsQuery } from "~~/graphql";
import useNow from "~~/hooks/liteflow/useNow";
import useOrderByQuery from "~~/hooks/liteflow/useOrderByQuery";
import usePaginateQuery from "~~/hooks/liteflow/usePaginateQuery";
import { parseBigNumber } from "~~/hooks/liteflow/useParseBigNumber";
import useSigner from "~~/hooks/liteflow/useSigner";
import { useDeployedContractInfo, useScaffoldContractRead } from "~~/hooks/scaffold-eth";
import { useOwnedNFTs } from "~~/hooks/useOwnedNFTs";
import { formatAddress, formatString, isSameAddress } from "~~/utils/liteflow";
import { getParsedError, notification } from "~~/utils/scaffold-eth";

let __onSaleAssets: FetchOnSaleAssetsQuery | undefined;

interface AssetOnSale {
  id: string;
  unitPrice: string;
  availableQuantity: string;
  expiredAt: Date;
  createdAt: Date;
  maker: {
    address: string;
  };
  asset: {
    id: string;
    chainId: number;
    collectionAddress: string;
    tokenId: string;
    owned: {
      quantity: string;
    } | null;
  };
  currency: {
    id: string;
    decimals: number;
    symbol: string;
  };
}

const makeCollectionId = <Asset extends { collectionAddress: string; tokenId: string }>(
  asset: Asset,
  length?: number,
) => `${asset.tokenId}-${length ? formatAddress(asset.collectionAddress, length) : asset.collectionAddress}`;

const Box = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex flex-col bg-base-100 px-10 py-10 text-center items-center max-w-xs rounded-3xl">
      {children}
    </div>
  );
};

const DisplayOnSale = <Item extends AssetOnSale>({
  item,
  refetchOnSale,
  ...otherProps
}: {
  item: Item;
  refetchOnSale: () => void;
}) => {
  const { address } = useAccount();
  const { famAddr } = useOwnedNFTs();
  const isFamily = item.asset.collectionAddress == famAddr;
  const { data: props } = useScaffoldContractRead({
    contractName: "Beaters",
    functionName: isFamily ? "familyProps" : "memberProps",
    args: [BigInt(item.asset.tokenId)],
  });

  const signer = useSigner();
  const [acceptOffer, { activeStep, transactionHash }] = useAcceptOffer(signer);

  const handleAcceptOffer = async () => {
    try {
      await acceptOffer(item.id, 1);
      refetchOnSale();
    } catch (e: any) {
      const message = getParsedError(e);
      notification.error(message);
    }
  };

  const collectionId = makeCollectionId(item.asset, 7);
  const nftType = isFamily ? "Family" : "Member";

  if (!props) {
    return <div>Loading {collectionId}</div>;
  }

  return (
    <div {...otherProps} style={{ marginBottom: "1.5rem", border: "solid red 2px", padding: "5px" }}>
      <div className="flex items-center">Type: {nftType}</div>
      <div className="flex items-center">
        Stake Weight: {formatEther("totalStakeWeight" in props ? props.totalStakeWeight : props.stakeWeight)}
      </div>
      <div className="flex items-center">
        Price: {item.currency.symbol} {formatEther(BigInt(item.unitPrice || "0"))}
      </div>

      {!isSameAddress(address || "", item.maker.address) && (
        <div className="flex items-center">
          {activeStep === AcceptOfferStep.INITIAL && (
            <button className="btn btn-secondary btn-sm" onClick={handleAcceptOffer}>
              Buy {nftType} {collectionId}
            </button>
          )}
          {activeStep === AcceptOfferStep.APPROVAL_SIGNATURE && <p>Please sign the message in wallet</p>}
          {activeStep === AcceptOfferStep.APPROVAL_PENDING && <p>Message signature is pending</p>}
          {activeStep === AcceptOfferStep.TRANSACTION_SIGNATURE && <p>Please sign transaction in wallet</p>}
          {activeStep === AcceptOfferStep.TRANSACTION_PENDING && <p>Transaction is pending</p>}
          {activeStep === AcceptOfferStep.OWNERSHIP && <p>Verifying ownership</p>}
          {transactionHash && <p>Transaction hash is {formatString(transactionHash)}</p>}
        </div>
      )}
    </div>
  );
};

const ExchangeNfts = () => {
  const { address: connectedAddress } = useAccount();

  const beatAddress = useDeployedContractInfo("Beat").data?.address;
  const { data: beatDecimals } = useScaffoldContractRead({ contractName: "Beat", functionName: "decimals" });
  const [nftToExchange, setNftToExchange] = useState<{
    nft: AssetDetailFragment;
    direction: "BUY" | "SELL";
    price: string;
  }>();

  const orderBy = useOrderByQuery<OffersOrderBy>("CREATED_AT_DESC");
  const { limit, offset } = usePaginateQuery();
  const now = useNow();
  const { data: _onSaleAssets, refetch: refetchOnSale } = useFetchOnSaleAssetsQuery({
    variables: { address: connectedAddress || "", limit, offset, orderBy, now },
  });
  const { onSaleAssets, onSaleIds } = useMemo(<T extends AssetOnSale>() => {
    const values = (__onSaleAssets = _onSaleAssets || __onSaleAssets)?.offers?.nodes.reduce<{
      [key: string]: T;
    }>((acc, current) => {
      const key = makeCollectionId(current.asset);
      let value = acc[key];

      if (!value || current.expiredAt > value.expiredAt) {
        value = current as unknown as T;
      }

      acc[key] = value;
      return acc;
    }, {});

    const [onSaleIds, onSaleAssets] = values ? [Object.keys(values), Object.values(values)] : [[], []];

    return { onSaleAssets, onSaleIds };
  }, [_onSaleAssets]);
  const { nfts, famAddr, refetch: refetchOwnedNfts } = useOwnedNFTs();
  const ownedNFTs = useMemo(() => nfts?.filter(nft => !onSaleIds.includes(makeCollectionId(nft))), [nfts, onSaleIds]);

  const signer = useSigner();
  const [createOffer, { activeStep, transactionHash }] = useCreateOffer(signer);

  const handleCreateOffer = async () => {
    try {
      if (!beatAddress || !beatDecimals) {
        throw "Beat Address not set";
      }

      if (!nftToExchange || nftToExchange.direction != "SELL") {
        return;
      }
      const asset = nftToExchange.nft;
      const price = parseBigNumber(nftToExchange.price, beatDecimals);

      await createOffer({
        type: "SALE",
        chain: asset.chainId,
        collection: toAddress(asset.collectionAddress),
        token: asset.tokenId,
        quantity: BigNumber.from(1), // Quantity of asset to offer. Must be 1 for offer on ERC721. Use BigNumber
        unitPrice: {
          amount: price,
          currency: toAddress(beatAddress),
        },
        // 30 days
        expiredAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1_000),
      });

      refetchOwnedNfts();
      refetchOnSale();
    } catch (e: any) {
      const message = getParsedError(e);
      notification.error(message);
    }
  };

  if (!ownedNFTs || !onSaleAssets) {
    return <>Loading..</>;
  }

  if (!ownedNFTs.length && !onSaleAssets.length) {
    return <>Nothing to do here</>;
  }

  return (
    <>
      {!!ownedNFTs.length && (
        <Box>
          {activeStep == CreateOfferStep.INITIAL && (
            <>
              <div className="py-5 space-y-3 first:pt-0 last:pb-1">
                <h2>Place NFT on Sale</h2>
                <div className="flex items-center">
                  Owned NFTs
                  <select
                    className="select w-full max-w-xs"
                    onChange={e => {
                      const selectedNft = ownedNFTs.at(e.target.selectedIndex - 1);
                      if (selectedNft) {
                        setNftToExchange({ direction: "SELL", nft: selectedNft, price: "" });
                      } else {
                        setNftToExchange(undefined);
                      }
                    }}
                  >
                    {[
                      <option key={`sell-nft`} selected={!nftToExchange}>
                        Select NFT to sell
                      </option>,
                      ...ownedNFTs.map(ownedNft => (
                        <option
                          value={ownedNft.tokenId}
                          selected={
                            nftToExchange?.direction == "SELL" &&
                            nftToExchange.nft.tokenId == ownedNft.tokenId &&
                            nftToExchange.nft.collectionAddress == ownedNft.collectionAddress
                          }
                          key={`sell-nft${ownedNft.tokenId + ownedNft.collectionAddress}`}
                        >
                          {ownedNft.collectionAddress == famAddr ? "Family" : "Member"} {ownedNft.tokenId}
                        </option>
                      )),
                    ]}
                  </select>
                </div>

                {nftToExchange && (
                  <>
                    <IntegerInput
                      placeholder="Sale Price in Beat"
                      value={nftToExchange.price}
                      onChange={function (newValue: string | bigint): void {
                        setNftToExchange(data => {
                          if (data) {
                            data.price = newValue.toString();
                          }

                          return Object.assign({}, data);
                        });
                      }}
                    />
                  </>
                )}
              </div>

              {nftToExchange?.price && (
                <button className="btn btn-secondary btn-sm" onClick={handleCreateOffer}>
                  Create Sell Offer
                </button>
              )}
            </>
          )}

          {activeStep === CreateOfferStep.APPROVAL_SIGNATURE && <p>Please sign message in wallet</p>}
          {activeStep === CreateOfferStep.APPROVAL_PENDING && <p>Message signature is pending</p>}
          {activeStep === CreateOfferStep.SIGNATURE && <p>Signature is being asked</p>}
          {transactionHash && <p>Transaction hash is {formatString(transactionHash)}</p>}
        </Box>
      )}
      {!!onSaleAssets?.length && (
        <Box>
          <h2>NFTs on Sale</h2>
          {onSaleAssets.map(onsale => (
            <DisplayOnSale
              key={makeCollectionId(onsale.asset)}
              item={onsale}
              refetchOnSale={() => {
                refetchOwnedNfts();
                refetchOnSale();
              }}
            />
          ))}
        </Box>
      )}
    </>
  );
};

export default ExchangeNfts;
