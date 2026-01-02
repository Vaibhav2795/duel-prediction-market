import { Account } from "@aptos-labs/ts-sdk"
import { aptos, MODULE_ADDRESS, waitForTransaction } from "@/config/aptos"

const ESCROW_MODULE = `${MODULE_ADDRESS}::escrow`

export async function deposit({
  player,
  adminAddress,
  matchId,
}: {
  player: Account
  adminAddress: string
  matchId: number
}): Promise<string> {
  const transaction = await aptos.transaction.build.simple({
    sender: player.accountAddress,
    data: {
      function: `${ESCROW_MODULE}::deposit`,
      functionArguments: [adminAddress, matchId],
    },
  })

  const signature = aptos.transaction.sign({
    signer: player,
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

    if (vmStatus.includes("EALREADY_DEPOSITED")) {
      throw new Error(
        `Player has already deposited for match_id ${matchId}. Error code: EALREADY_DEPOSITED (2)`
      )
    }

    throw error
  }

  return committedTxn.hash
}
