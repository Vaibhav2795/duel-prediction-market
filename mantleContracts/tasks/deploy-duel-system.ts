import { HardhatRuntimeEnvironment } from "hardhat/types/hre";

export default async function (
  taskArguments: {},
  hre: HardhatRuntimeEnvironment
) {
  const { ethers } = await hre.network.connect();
  const network = await ethers.provider.getNetwork();
  const [deployer] = await ethers.getSigners();

  console.log(`Deploying Duel system contracts on ${network.name} (${network.chainId})...`);
  console.log(`Deployer: ${deployer.address}`);

  // Determine confirmation count based on network
  const isMainnet = network.chainId === BigInt(5000) || network.chainId === BigInt(5001); // Mantle mainnet/testnet
  const confirmations = isMainnet ? 3 : 1;

  if (isMainnet) {
    console.log(`⚠️  Mainnet deployment detected - waiting for ${confirmations} confirmations after each deployment`);
  }

  // Step 1: Deploy Duel Token
  console.log("\n=== Step 1: Deploying Duel Token ===");
  const DuelFactory = await ethers.getContractFactory("Duel");
  const duelToken = await DuelFactory.deploy();
  const duelTokenDeployTx = duelToken.deploymentTransaction();
  if (duelTokenDeployTx) {
    await duelTokenDeployTx.wait(confirmations);
  }
  await duelToken.waitForDeployment();
  const duelTokenAddress = await duelToken.getAddress();
  console.log(`✓ Duel Token deployed at: ${duelTokenAddress} (${confirmations} confirmations)`);

  // Step 2: Deploy PredictionMarket with Duel token address
  console.log("\n=== Step 2: Deploying PredictionMarket ===");
  const PredictionMarketFactory = await ethers.getContractFactory("PredictionMarket");
  const predictionMarket = await PredictionMarketFactory.deploy(duelTokenAddress);
  const predictionMarketDeployTx = predictionMarket.deploymentTransaction();
  if (predictionMarketDeployTx) {
    await predictionMarketDeployTx.wait(confirmations);
  }
  await predictionMarket.waitForDeployment();
  const predictionMarketAddress = await predictionMarket.getAddress();
  console.log(`✓ PredictionMarket deployed at: ${predictionMarketAddress} (${confirmations} confirmations)`);

  // Step 3: Deploy ChessEscrow with Duel token address
  console.log("\n=== Step 3: Deploying ChessEscrow ===");
  const ChessEscrowFactory = await ethers.getContractFactory("ChessEscrow");
  const chessEscrow = await ChessEscrowFactory.deploy(duelTokenAddress);
  const chessEscrowDeployTx = chessEscrow.deploymentTransaction();
  if (chessEscrowDeployTx) {
    await chessEscrowDeployTx.wait(confirmations);
  }
  await chessEscrow.waitForDeployment();
  const chessEscrowAddress = await chessEscrow.getAddress();
  console.log(`✓ ChessEscrow deployed at: ${chessEscrowAddress} (${confirmations} confirmations)`);

  // Summary
  console.log("\n=== Deployment Summary ===");
  console.log("Duel Token:", duelTokenAddress);
  console.log("PredictionMarket:", predictionMarketAddress);
  console.log("ChessEscrow:", chessEscrowAddress);
  console.log("\nAll contracts deployed successfully!");

  // Output JSON for easy parsing
  const output = {
    network: {
      name: network.name,
      chainId: network.chainId.toString(),
    },
    deployer: deployer.address,
    contracts: {
      duelToken: duelTokenAddress,
      predictionMarket: predictionMarketAddress,
      chessEscrow: chessEscrowAddress,
    },
  };

  console.log("\n=== JSON Output ===");
  console.log(JSON.stringify(output, null, 2));
}

