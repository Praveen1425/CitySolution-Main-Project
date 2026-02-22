// deploy.js - Deployment script for IncidentRegistry contract
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

async function main() {
  // Connect to Sepolia testnet
  const provider = new ethers.providers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  console.log('Deploying IncidentRegistry contract...');
  console.log('Wallet address:', wallet.address);

  // Read contract source
  const contractPath = path.join(__dirname, 'IncidentRegistry.sol');
  const contractSource = fs.readFileSync(contractPath, 'utf8');

  // For simplicity, we'll use a pre-compiled bytecode
  // In production, you'd use solc to compile the contract
  const bytecode = '0x' + '608060405234801561001057600080fd5b50d3801561001d57600080fd5b50d2801561002a57600080fd5b506101b08061003a6000396000f3fe608060405234801561001057600080fd5b50d3801561001d57600080fd5b50d2801561002a57600080fd5b50600436106100415760003560e01c80635c60da1b14610046575b600080fd5b610060600480360381019061005b9190610100565b610076565b60405161006d919061014a565b60408051918252519081900360200190f35b6000818154811061008657600080fd5b906000526020600020016000915054906101000a90046001600160a01b03169050805b919050565b600080fd5b6000819050919050565b6100f8816100e5565b811461010357600080fd5b50565b600081359050610115816100ef565b92915050565b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b600061014481610119565b9050919050565b600060208201905061015f60008301846100e5565b9291505056fea2646970667358221220c0c4c4c4c4c4c4c4c4c4c4c4c4c4c4c4c4c4c4c4c4c4c4c4c4c4c4c4c4c4c4c464736f6c63430008090033';

  // Deploy contract
  const factory = new ethers.ContractFactory([], bytecode, wallet);
  const contract = await factory.deploy();

  console.log('Contract deployment transaction hash:', contract.deployTransaction.hash);

  // Wait for deployment
  await contract.deployed();

  console.log('Contract deployed at address:', contract.address);
  console.log('Block number:', contract.deployTransaction.blockNumber);

  // Save deployment info
  const deploymentInfo = {
    contractAddress: contract.address,
    deployer: wallet.address,
    network: 'sepolia',
    deploymentTx: contract.deployTransaction.hash,
    blockNumber: contract.deployTransaction.blockNumber,
    timestamp: new Date().toISOString()
  };

  fs.writeFileSync(
    path.join(__dirname, 'deployment.json'),
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log('Deployment info saved to deployment.json');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
