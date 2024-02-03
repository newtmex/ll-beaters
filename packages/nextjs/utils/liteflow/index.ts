import { getAddress, isAddress } from "viem";

export const formatAddress = (address: string | undefined, length = 10): string => {
  if (!address) return "";
  if (!isAddress(address)) return "";
  const parsed = getAddress(address);

  return formatString(parsed, length);
};

export const isSameAddress = (addressA: string, addressB: string): boolean => {
  return addressA.toLowerCase() === addressB.toLowerCase();
};

export const formatString = (s: string | undefined, length = 10): string => {
  if (!s) return "";
  const chars = (length - 2) / 2;

  return `${s.substring(0, chars + 2)}...${s.substring(42 - chars)}`;
};
