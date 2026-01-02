import { Account, Ed25519PrivateKey } from "@aptos-labs/ts-sdk"
import { CreateEscrowParams } from "./escrow.types"
import { aptos, MODULE_ADDRESS, waitForTransaction } from "@/config/aptos"

function parseAbortCode(vmStatus?: string): number | null {
  if (!vmStatus) return null
  const match = vmStatus.match(/abort code: (\d+)/i)
  return match ? Number(match[1]) : null
}

const ESCROW_MODULE = `${MODULE_ADDRESS}::escrow`

export async function initializeEscrow(account: Account) {
  console.log("\n=== Initializing Escrow Store ===\n")
  console.log(`Using account: ${account.accountAddress}`)

  const transaction = await aptos.transaction.build.simple({
    sender: account.accountAddress,
    data: {
      function: `${ESCROW_MODULE}::initialize`,
      functionArguments: [],
    },
  })

  const signature = aptos.transaction.sign({
    signer: account,
    transaction,
  })

  const committedTxn = await aptos.transaction.submit.simple({
    transaction,
    senderAuthenticator: signature,
  })

  console.log(`Transaction submitted: ${committedTxn.hash}`)
  console.log(
    `Explorer: https://explorer.movementnetwork.xyz/txn/${committedTxn.hash}?network=custom`
  )

  await waitForTransaction(committedTxn.hash)
  return committedTxn.hash
}

export function handleCreateEscrowError(
  error: any,
  params: CreateEscrowParams
): never {
  const vmStatus = error?.transaction?.vm_status || error?.message || ""
  const abortCode = parseAbortCode(vmStatus)

  if (abortCode === 5 || vmStatus.includes("EESCROW_ALREADY_EXISTS")) {
    throw new Error(
      `Escrow already exists for match_id ${params.matchId}. Error code: EESCROW_ALREADY_EXISTS (5)`
    )
  }

  if (
    vmStatus.includes("borrow_global") ||
    vmStatus.includes("does not exist") ||
    vmStatus.includes("EscrowStore") ||
    (abortCode === null && vmStatus.includes("code offset 0"))
  ) {
    throw new Error(
      "EscrowStore not initialized. Please call initializeEscrow() first."
    )
  }

  if (abortCode === 1 || vmStatus.includes("ENOT_ADMIN")) {
    throw new Error("Not authorized as admin. Error code: ENOT_ADMIN (1)")
  }

  throw error
}

export function createAccountFromPrivateKey(privateKeyHex: string): Account {
  const privateKey = new Ed25519PrivateKey(privateKeyHex)
  return Account.fromPrivateKey({ privateKey })
}

export async function checkEscrowStoreExists(
  adminAddress: string
): Promise<boolean> {
  try {
    const resources = await aptos.getAccountResources({
      accountAddress: adminAddress,
    })
    const escrowStoreType = `${MODULE_ADDRESS}::escrow::EscrowStore`
    return resources.some((r) => r.type === escrowStoreType)
  } catch (error) {
    return false
  }
}

export async function getAccountBalance(
  accountAddress: string
): Promise<number> {
  const resources = await aptos.getAccountResources({ accountAddress })
  const coinResource = resources.find(
    (r) => r.type === "0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>"
  )
  if (coinResource && "data" in coinResource) {
    return Number((coinResource.data as any).coin.value)
  }
  return 0
}
