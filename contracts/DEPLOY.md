# Deploying the Chess Escrow Module

The module needs to be deployed to the Movement Network testnet before it can be used.

## Prerequisites

1. Install Aptos CLI:
   ```bash
   # macOS
   brew install aptos
   
   # Or download from: https://aptos.dev/tools/aptos-cli/
   ```

2. Set up your account:
   ```bash
   aptos init --network custom --rest-url https://testnet.movementnetwork.xyz/v1 --faucet-url https://faucet.testnet.movementnetwork.xyz
   ```

## Deployment Steps

1. Navigate to the contracts directory:
   ```bash
   cd contracts
   ```

2. Compile the module:
   ```bash
   aptos move compile --named-addresses chess_escrow=0xed101e6c098f47d3a9ff8cf2dae4331fc2a55848502942246878b2ab63b90b4d
   ```

3. Deploy the module:
   ```bash
   aptos move publish \
     --named-addresses chess_escrow=0xed101e6c098f47d3a9ff8cf2dae4331fc2a55848502942246878b2ab63b90b4d \
     --assume-yes
   ```

   **Important**: The account you're deploying from must be the same as the address in `Move.toml` (`0xed101e6c098f47d3a9ff8cf2dae4331fc2a55848502942246878b2ab63b90b4d`).

   If your account address is different, you have two options:

   **Option A**: Update `Move.toml` to use your account address:
   ```toml
   [addresses]
   chess_escrow = "YOUR_ACCOUNT_ADDRESS"
   ```

   **Option B**: Use a resource account or update the `MODULE_ADDRESS` in your backend/scripts config to match your deployment address.

4. Verify deployment:
   ```bash
   curl "https://testnet.movementnetwork.xyz/v1/accounts/YOUR_ADDRESS/modules"
   ```

   You should see the `escrow` module listed.

5. Update the deployment transaction hash:
   After deployment, update the `DEPLOYMENT_TX_HASH` in:
   - `scripts/config.ts`
   - `backend/src/config/aptos.ts`

## After Deployment

Once deployed, you can:
1. Initialize the escrow store (one-time operation)
2. Create escrows for matches
3. Use the prediction market functions

## Troubleshooting

- **"Account not found"**: Make sure your account has been created and funded
- **"Module already exists"**: The module is already deployed at that address
- **"Insufficient balance"**: Fund your account from the faucet:
  ```bash
  aptos account fund-with-faucet --account default --amount 100000000
  ```

