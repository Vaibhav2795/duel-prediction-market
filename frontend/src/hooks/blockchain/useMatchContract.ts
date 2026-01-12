import { useWalletClient, usePublicClient } from "wagmi"
import { type Abi, type Address as ViemAddress } from "viem"
import { Address } from "./types"

export function useMatchContract(address: Address, abi: Abi) {
  const { data: wallet } = useWalletClient()
  const publicClient = usePublicClient()

  if (!wallet || !publicClient) {
    return null
  }

  return {
    wallet,
    publicClient,
    contract: {
      address: address as ViemAddress,
      abi,
    },
  }
}
