import { Account } from "@aptos-labs/ts-sdk"
import { aptos, MODULE_ADDRESS, waitForTransaction, getAccountBalance } from "@/config/aptos"
import { DepositParams } from "./escrow.types"
import { createAccountFromPrivateKey } from "./escrow.utils"

const ESCROW_MODULE = `${MODULE_ADDRESS}::escrow`

export async function deposit({
  player,
  adminAddress,
  matchId,
}: DepositParams): Promise<string> {
  // Player should be a private key string that we convert to Account
  if (!player || typeof player !== "string") {
    throw new Error("Player private key is required for deposit")
  }

  const playerAccount = createAccountFromPrivateKey(player)

  // Optional: Check balance before depositing
  const balance = await getAccountBalance(playerAccount.accountAddress.toString())
  console.log(`Player balance: ${balance}`)

  const transaction = await aptos.transaction.build.simple({
    sender: playerAccount.accountAddress,
    data: {
      function: `${ESCROW_MODULE}::deposit`,
      functionArguments: [adminAddress, matchId],
    },
  })

  const signature = aptos.transaction.sign({
    signer: playerAccount,
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
