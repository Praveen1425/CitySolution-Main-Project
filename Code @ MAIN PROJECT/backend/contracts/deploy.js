// deploy.js - Deploy IncidentRegistry to Sepolia using ethers v6 and prebuilt ABI
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

async function main() {
  const rpcUrl = process.env.SEPOLIA_RPC_URL;
  const privateKey = process.env.PRIVATE_KEY;

  if (!rpcUrl || !privateKey) {
    throw new Error('Missing SEPOLIA_RPC_URL or PRIVATE_KEY');
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);

  console.log('Deploying IncidentRegistry...');
  console.log('Deployer:', wallet.address);

  // Read ABI
  const abiPath = path.join(__dirname, 'IncidentRegistry.abi.json');
  const abi = JSON.parse(fs.readFileSync(abiPath, 'utf8'));

  // Bytecode: compile with Hardhat and paste into contracts/IncidentRegistry.bytecode
  const bytecodePath = path.join(__dirname, 'IncidentRegistry.bytecode');
  if (!fs.existsSync(bytecodePath)) {
    throw new Error('Missing contracts/IncidentRegistry.bytecode. Compile with Hardhat and paste 0x bytecode here.');
  }
  const bytecode = fs.readFileSync(bytecodePath, 'utf8').trim();

  const factory = new ethers.ContractFactory(abi, bytecode, wallet);
  const contract = await factory.deploy();
  const receipt = await contract.deploymentTransaction().wait(1);

  console.log('Contract address:', contract.target);
  console.log('Tx hash:', receipt.hash);

  const deploymentInfo = {
    contractAddress: contract.target,
    deployer: wallet.address,
    network: 'sepolia',
    deploymentTx: receipt.hash,
    blockNumber: receipt.blockNumber,
    timestamp: new Date().toISOString()
  };
  fs.writeFileSync(path.join(__dirname, 'deployment.json'), JSON.stringify(deploymentInfo, null, 2));
  console.log('Saved deployment info to contracts/deployment.json');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
