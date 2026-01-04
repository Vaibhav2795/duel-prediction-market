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

  let transaction
  try {
    transaction = await aptos.transaction.build.simple({
      sender: account.accountAddress,
      data: {
        function: `${ESCROW_MODULE}::initialize`,
        functionArguments: [],
      },
    })
  } catch (error: any) {
    // Check if the error is about module not found
    const errorMessage = error?.message || ""
    if (
      errorMessage.includes("module_not_found") ||
      errorMessage.includes("Module not found") ||
      errorMessage.includes("module/escrow") ||
      error?.error_code === "module_not_found"
    ) {
      throw new Error(
        `Escrow module not found at address ${MODULE_ADDRESS}. ` +
        `The module needs to be deployed first. ` +
        `Please deploy the chess_escrow module to this address before initializing. ` +
        `If you've already deployed it, verify the MODULE_ADDRESS in backend/src/config/aptos.ts matches your deployment address. ` +
        `The scripts in the scripts/ directory work because they use the same configuration - check if there's a difference.`
      )
    }
    throw error
  }

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

/**
 * Convert MongoDB ObjectId to a number for Move contract (u64)
 * ObjectId is 24 hex chars, we take first 13 chars to fit in safe integer range
 * This ensures we can convert to number without precision loss
 */
export function objectIdToNumber(objectId: string | { toString(): string }): number {
  const objectIdHex = typeof objectId === 'string' ? objectId : objectId.toString()
  // Take first 13 hex characters (52 bits) to stay within Number.MAX_SAFE_INTEGER
  // This gives us a unique number for each ObjectId while staying safe
  return parseInt(objectIdHex.substring(0, 13), 16)
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

// Note: getAccountBalance is exported from @/config/aptos
// Keeping this for backward compatibility but prefer using from config
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
