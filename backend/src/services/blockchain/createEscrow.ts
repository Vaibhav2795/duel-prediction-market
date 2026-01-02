import { aptos, MODULE_ADDRESS, waitForTransaction } from "@/config/aptos"
import { CreateEscrowParams } from "./escrow.types"
import {
  checkEscrowStoreExists,
  createAccountFromPrivateKey,
  handleCreateEscrowError,
  initializeEscrow,
} from "./escrow.utils"

export async function createEscrow({
  matchId,
  player1,
  player2,
  amount,
}: CreateEscrowParams): Promise<string> {
  const privateKey = process.env.PRIVATE_KEY
  if (!privateKey) {
    throw new Error("PRIVATE_KEY env variable is missing")
  }

  const adminAccount = createAccountFromPrivateKey(privateKey)
  const adminAddress = adminAccount.accountAddress.toString()

  const storeExists = await checkEscrowStoreExists(adminAddress)

  if (!storeExists) {
    try {
      await initializeEscrow(adminAccount)
    } catch (error) {
      handleCreateEscrowError(error, { matchId, player1, player2, amount })
    }
  }

  const transaction = await aptos.transaction.build.simple({
    sender: adminAccount.accountAddress,
    data: {
      function: `${MODULE_ADDRESS}::escrow::create_escrow`,
      functionArguments: [matchId, player1, player2, amount],
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
  } catch (error) {
    handleCreateEscrowError(error, { matchId, player1, player2, amount })
  }

  return committedTxn.hash
}
