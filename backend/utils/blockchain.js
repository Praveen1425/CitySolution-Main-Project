// utils/blockchain.js - Hashing and optional on-chain publishing via ethers
const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');
const ngeohash = require('ngeohash');

/**
 * Build a canonical string for hashing. Keep ordering stable.
 * Only include deterministic, user/content fields.
 */
function buildCanonicalIncident(incident) {
  return JSON.stringify({
    id: incident.id,
    title: incident.title,
    description: incident.description,
    category: incident.category,
    location: incident.location,
    latitude: incident.latitude ?? null,
    longitude: incident.longitude ?? null,
    imageUrl: incident.imageUrl || null,
    ipfsCid: incident.ipfsCid || null,
    createdAt: incident.createdAt,
  });
}

/**
 * Compute keccak256 hash of incident canonical representation
 * @param {object} incident
 * @returns {string} 0x-prefixed bytes32 hex string
 */
function computeIncidentHash(incident) {
  const canonical = buildCanonicalIncident(incident);
  return ethers.utils.keccak256(ethers.utils.toUtf8Bytes(canonical));
}

/**
 * Generate location key for uniqueness checking
 * @param {number} latitude
 * @param {number} longitude
 * @param {number} precision - geohash precision (default: 7)
 * @returns {string} 0x-prefixed bytes32 hex string
 */
function generateLocationKey(latitude, longitude, precision = 7) {
  const geohash = ngeohash.encode(latitude, longitude, precision);
  return ethers.utils.keccak256(ethers.utils.toUtf8Bytes(geohash));
}

/**
 * Check if location already has an incident on-chain
 * @param {string} locationKey
 * @returns {Promise<boolean>} true if location already has incident
 */
async function checkLocationExists(locationKey) {
  const rpcUrl = process.env.SEPOLIA_RPC_URL;
  const contractAddr = process.env.CONTRACT_ADDR;

  if (!rpcUrl || !contractAddr) {
    return false; // Skip check if not configured
  }

  try {
    const abiPath = path.join(__dirname, '..', 'contracts', 'IncidentRegistry.abi.json');
    const abi = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const contract = new ethers.Contract(contractAddr, abi, provider);
    
    const existingId = await contract.getIdByLocation(locationKey);
    return existingId.toString() !== '0';
  } catch (error) {
    console.warn('Failed to check location on-chain:', error.message);
    return false;
  }
}

/**
 * Publish incident to chain with location uniqueness check
 * @param {object} incident - incident object with all fields
 * @returns {Promise<{txHash: string, chainId: number}>} transaction details
 */
async function registerIncidentOnChain(incident) {
  const rpcUrl = process.env.SEPOLIA_RPC_URL;
  const privateKey = process.env.PRIVATE_KEY;
  const contractAddr = process.env.CONTRACT_ADDR;

  if (!rpcUrl || !privateKey || !contractAddr) {
    throw new Error('Missing blockchain env: SEPOLIA_RPC_URL, PRIVATE_KEY, CONTRACT_ADDR');
  }

  const abiPath = path.join(__dirname, '..', 'contracts', 'IncidentRegistry.abi.json');
  const abi = JSON.parse(fs.readFileSync(abiPath, 'utf8'));

  const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  const contract = new ethers.Contract(contractAddr, abi, wallet);

  // Generate location key and check for duplicates
  const locationKey = generateLocationKey(incident.latitude, incident.longitude);
  const exists = await checkLocationExists(locationKey);
  
  if (exists) {
    throw new Error('ALREADY_REPORTED: An incident was already reported at this location');
  }

  // Compute hash and register
  const hashHex = computeIncidentHash(incident);
  const ipfsCid = incident.ipfsCid || '';
  
  const tx = await contract.registerIncident(hashHex, ipfsCid, locationKey, { 
    gasLimit: 300000 
  });
  const receipt = await tx.wait(1); // Wait for 1 confirmation
  
  return {
    txHash: receipt.transactionHash,
    chainId: receipt.chainId,
    blockNumber: receipt.blockNumber
  };
}

/**
 * Verify incident hash on-chain
 * @param {number} chainId - on-chain incident ID
 * @returns {Promise<{matches: boolean, onChainHash: string, computedHash: string}>}
 */
async function verifyIncidentOnChain(chainId, incident) {
  const rpcUrl = process.env.SEPOLIA_RPC_URL;
  const contractAddr = process.env.CONTRACT_ADDR;

  if (!rpcUrl || !contractAddr) {
    throw new Error('Missing blockchain env: SEPOLIA_RPC_URL, CONTRACT_ADDR');
  }

  const abiPath = path.join(__dirname, '..', 'contracts', 'IncidentRegistry.abi.json');
  const abi = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
  const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
  const contract = new ethers.Contract(contractAddr, abi, provider);

  const onChainHash = await contract.getIncidentHash(chainId);
  const computedHash = computeIncidentHash(incident);
  
  return {
    matches: onChainHash === computedHash,
    onChainHash,
    computedHash
  };
}

module.exports = {
  computeIncidentHash,
  generateLocationKey,
  checkLocationExists,
  registerIncidentOnChain,
  verifyIncidentOnChain,
};


