// hooks/web3/useWalletBalance.ts
import { useAccount, useBalance, useChainId } from "wagmi"
import { useMemo } from "react"
import { mantleSepolia } from "../../config/chains"
import { Address } from "./types"

export function useWalletBalance(tokenAddress?: Address) {
  const { address } = useAccount()
  const chainId = useChainId()

  const isCorrectChain = chainId === mantleSepolia.id

  const { data, isLoading, isError, refetch } = useBalance({
    address,
    chainId: mantleSepolia.id,
    token: tokenAddress, // undefined = native coin
    query: {
      enabled: !!address && isCorrectChain,
      refetchInterval: 10_000, // every 10s
      refetchOnWindowFocus: true,
    },
  })

  const balance = useMemo(() => {
    if (!data) return "0"
    return Number(data.formatted).toFixed(4)
  }, [data])

  return {
    address,
    balance,
    symbol: data?.symbol ?? "MNT",
    isCorrectChain,
    isLoading,
    isError,
    refetch,
  }
}
