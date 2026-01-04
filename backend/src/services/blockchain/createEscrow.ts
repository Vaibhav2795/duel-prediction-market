import { Account } from "@aptos-labs/ts-sdk"
import { aptos, MODULE_ADDRESS, waitForTransaction } from "@/config/aptos"
import { CreateEscrowParams } from "./escrow.types"
import {
  checkEscrowStoreExists,
  createAccountFromPrivateKey,
  handleCreateEscrowError,
  initializeEscrow,
} from "./escrow.utils"

const ESCROW_MODULE = `${MODULE_ADDRESS}::escrow`

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

  // Check if EscrowStore exists before proceeding
  // Note: We check for the resource, not the module. The module should already be deployed.
  let storeExists = false
  try {
    storeExists = await checkEscrowStoreExists(adminAddress)
  } catch (error: any) {
    // If we can't check resources, log but continue - the transaction build will fail if module doesn't exist
    console.warn("Warning: Could not check if EscrowStore exists:", error.message)
  }

  if (!storeExists) {
    try {
      await initializeEscrow(adminAccount)
    } catch (error: any) {
      // Check if the error is about module not found
      const errorMessage = error?.message || ""
      if (
        errorMessage.includes("module_not_found") ||
        errorMessage.includes("Module not found") ||
        errorMessage.includes("module/escrow")
      ) {
        throw new Error(
          `Escrow module not found at address ${MODULE_ADDRESS}. ` +
          `The module needs to be deployed first. ` +
          `Please deploy the chess_escrow module to this address before creating matches. ` +
          `If you've already deployed it, verify the MODULE_ADDRESS in backend/src/config/aptos.ts matches your deployment address.`
        )
      }
      handleCreateEscrowError(error, { matchId, player1, player2, amount })
    }
  }

  let transaction
  try {
    transaction = await aptos.transaction.build.simple({
      sender: adminAccount.accountAddress,
      data: {
        function: `${ESCROW_MODULE}::create_escrow`,
        functionArguments: [matchId, player1, player2, amount],
      },
    })
  } catch (error: any) {
    // Log the full error for debugging
    console.error("Error building create_escrow transaction:", {
      message: error?.message,
      error_code: error?.error_code,
      status: error?.status,
      statusCode: error?.statusCode,
      fullError: error,
    })

    // Check if the error is about module not found
    // The SDK might throw errors in different formats, so check multiple places
    const errorMessage = String(error?.message || "")
    const errorString = JSON.stringify(error || {})
    const errorCode = error?.error_code || error?.errorCode || ""
    
    // Check various error indicators
    const isModuleNotFound =
      errorMessage.includes("module_not_found") ||
      errorMessage.includes("Module not found") ||
      errorMessage.includes("module/escrow") ||
      errorString.includes("module_not_found") ||
      errorString.includes("Module not found") ||
      errorCode === "module_not_found" ||
      error?.error_code === "module_not_found"
    
    if (isModuleNotFound) {
      throw new Error(
        `Escrow module not found at address ${MODULE_ADDRESS}. ` +
        `The module needs to be deployed first. ` +
        `Please deploy the chess_escrow module to this address before creating matches. ` +
        `If you've already deployed it, verify the MODULE_ADDRESS in backend/src/config/aptos.ts matches your deployment address. ` +
        `The scripts in the scripts/ directory work because they use the same configuration. ` +
        `Original error: ${errorMessage || errorString}`
      )
    }
    throw error
  }

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
