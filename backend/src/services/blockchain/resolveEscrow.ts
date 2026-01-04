import { aptos, MODULE_ADDRESS, waitForTransaction } from "@/config/aptos"
import { ResolveWinParams, ResolveDrawParams } from "./escrow.types"
import { createAccountFromPrivateKey } from "./escrow.utils"

const ESCROW_MODULE = `${MODULE_ADDRESS}::escrow`

/**
 * Resolve escrow - winner takes all
 */
export async function resolveWin({
  matchId,
  winner,
}: ResolveWinParams): Promise<string> {
  const privateKey = process.env.PRIVATE_KEY
  if (!privateKey) {
    throw new Error("PRIVATE_KEY env variable is missing")
  }

  const adminAccount = createAccountFromPrivateKey(privateKey)

  const transaction = await aptos.transaction.build.simple({
    sender: adminAccount.accountAddress,
    data: {
      function: `${ESCROW_MODULE}::resolve_win`,
      functionArguments: [matchId, winner],
    },
  })

  const signature = aptos.transaction.sign({
    signer: adminAccount,
    transaction,
  })

  const committedTxn = await aptos.transaction.submit.simple({
    transaction,
    senderAuthenticator: signature,
  })

  try {
    await waitForTransaction(committedTxn.hash)
  } catch (error: any) {
    const vmStatus = error?.transaction?.vm_status || error?.message || ""

    if (vmStatus.includes("EESCROW_NOT_FOUND")) {
      throw new Error(
        `Escrow not found for match_id ${matchId}. Error code: EESCROW_NOT_FOUND (4)`
      )
    }

    if (vmStatus.includes("EESCROW_NOT_READY")) {
      throw new Error(
        `Escrow not ready for match_id ${matchId}. Both players must deposit first. Error code: EESCROW_NOT_READY (3)`
      )
    }

    if (vmStatus.includes("ENOT_ADMIN")) {
      throw new Error(`Only admin can resolve escrow. Error code: ENOT_ADMIN (1)`)
    }

    throw error
  }

  return committedTxn.hash
}

/**
 * Resolve escrow - draw (split between players)
 */
export async function resolveDraw({
  matchId,
}: ResolveDrawParams): Promise<string> {
  const privateKey = process.env.PRIVATE_KEY
  if (!privateKey) {
    throw new Error("PRIVATE_KEY env variable is missing")
  }

  const adminAccount = createAccountFromPrivateKey(privateKey)

  const transaction = await aptos.transaction.build.simple({
    sender: adminAccount.accountAddress,
    data: {
      function: `${ESCROW_MODULE}::resolve_draw`,
      functionArguments: [matchId],
    },
  })

  const signature = aptos.transaction.sign({
    signer: adminAccount,
    transaction,
  })

  const committedTxn = await aptos.transaction.submit.simple({
    transaction,
    senderAuthenticator: signature,
  })

  try {
    await waitForTransaction(committedTxn.hash)
  } catch (error: any) {
    const vmStatus = error?.transaction?.vm_status || error?.message || ""

    if (vmStatus.includes("EESCROW_NOT_FOUND")) {
      throw new Error(
        `Escrow not found for match_id ${matchId}. Error code: EESCROW_NOT_FOUND (4)`
      )
    }

    if (vmStatus.includes("EESCROW_NOT_READY")) {
      throw new Error(
        `Escrow not ready for match_id ${matchId}. Both players must deposit first. Error code: EESCROW_NOT_READY (3)`
      )
    }

    if (vmStatus.includes("ENOT_ADMIN")) {
      throw new Error(`Only admin can resolve escrow. Error code: ENOT_ADMIN (1)`)
    }

    throw error
  }

  return committedTxn.hash
}

