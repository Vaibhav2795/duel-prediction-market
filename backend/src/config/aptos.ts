import {
  Aptos,
  AptosConfig,
  Network,
  Account,
  Ed25519PrivateKey,
} from "@aptos-labs/ts-sdk"

// Contract deployment information
export const MODULE_ADDRESS =
  "0xed101e6c098f47d3a9ff8cf2dae4331fc2a55848502942246878b2ab63b90b4d"
export const DEPLOYMENT_TX_HASH =
  "0x76223771c7f1720f65b1d1300659d101867676a996e225406b6aa10292eb258d"

// Test addresses
export const ADMIN_ADDRESS =
  "0xed101e6c098f47d3a9ff8cf2dae4331fc2a55848502942246878b2ab63b90b4d"
export const USER2_ADDRESS =
  "0x2cd9c41f929c001a11e57de6b8a7d607cb1f1aca7b8d0435a393f10ee39dbcfa"

// Network configuration for Movement Network
export const config = new AptosConfig({
  network: Network.CUSTOM,
  fullnode: "https://testnet.movementnetwork.xyz/v1",
  faucet: "https://faucet.testnet.movementnetwork.xyz/",
})

// Initialize the Aptos client
export const aptos = new Aptos(config)

// Helper function to create account from private key
export function createAccountFromPrivateKey(privateKeyHex: string): Account {
  const privateKey = new Ed25519PrivateKey(privateKeyHex)
  return Account.fromPrivateKey({ privateKey })
}

// Helper function to wait for transaction and log result
export async function waitForTransaction(transactionHash: string) {
  console.log(`Waiting for transaction: ${transactionHash}`)
  const response = await aptos.waitForTransaction({ transactionHash })

  if (!response.success) {
    // Extract comprehensive error details
    const vmStatus = response.vm_status || "Unknown error"
    const errorDetails = {
      hash: transactionHash,
      vm_status: vmStatus,
      gas_used: response.gas_used,
      version: response.version,
    }

    // Advanced error logging
    console.error("\n" + "=".repeat(80))
    console.error("❌ TRANSACTION FAILED - DETAILED ERROR INFORMATION")
    console.error("=".repeat(80))
    console.error("\n📋 Transaction Details:")
    console.error("  Hash:", transactionHash)
    console.error("  Version:", response.version)
    console.error("  Gas Used:", response.gas_used)
    console.error("  Success:", response.success)

    console.error("\n🔍 VM Status (Raw):")
    console.error("  ", vmStatus)

    // Parse error code if present
    const abortCodeMatch = vmStatus.match(/abort code: (\d+)/i)
    if (abortCodeMatch) {
      const abortCode = abortCodeMatch[1]
      console.error("\n📊 Abort Code:", abortCode)
      console.error("  Error Code Mapping:")
      console.error("    1 = ENOT_ADMIN")
      console.error("    2 = EALREADY_DEPOSITED")
      console.error("    3 = EESCROW_NOT_READY")
      console.error("    4 = EESCROW_NOT_FOUND")
      console.error("    5 = EESCROW_ALREADY_EXISTS")
    }

    // Check for specific error patterns
    console.error("\n🔎 Error Analysis:")
    if (
      vmStatus.includes("EESCROW_ALREADY_EXISTS") ||
      abortCodeMatch?.[1] === "5"
    ) {
      console.error("  → Escrow already exists for this match_id")
    } else if (
      vmStatus.includes("EESCROW_NOT_FOUND") ||
      abortCodeMatch?.[1] === "4"
    ) {
      console.error("  → Escrow not found (might need to create it first)")
    } else if (vmStatus.includes("ENOT_ADMIN") || abortCodeMatch?.[1] === "1") {
      console.error("  → Not authorized as admin")
    } else if (
      vmStatus.includes("borrow_global") ||
      vmStatus.includes("does not exist")
    ) {
      console.error(
        "  → Resource does not exist (EscrowStore might not be initialized)"
      )
    } else if (vmStatus.includes("code offset")) {
      const offsetMatch = vmStatus.match(/code offset (\d+)/)
      if (offsetMatch) {
        console.error(`  → Failed at code offset ${offsetMatch[1]}`)
        console.error("  → This could indicate:")
        console.error("     - EscrowStore not initialized (offset 0-2)")
        console.error("     - Escrow already exists (offset 4)")
        console.error("     - Other assertion failure")
      }
    }

    // Full transaction response for debugging
    console.error("\n📦 Full Transaction Response:")

    console.error("\n🔗 Explorer Link:")
    console.error(
      `  https://explorer.movementnetwork.xyz/txn/${transactionHash}?network=custom`
    )
    console.error("=".repeat(80) + "\n")

    const error: any = new Error(`Transaction failed: ${vmStatus}`)
    error.transaction = response
    error.details = errorDetails
    throw error
  }

  console.log(`✓ Transaction completed successfully:`, {
    success: response.success,
    version: response.version,
    gas_used: response.gas_used,
    vm_status: response.vm_status,
  })
  return response
}

// Helper function to get account balance
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
