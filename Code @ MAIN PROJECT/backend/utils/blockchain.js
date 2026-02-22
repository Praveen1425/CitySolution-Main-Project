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
  // Use only stable, user-provided content for hashing.
  // Exclude volatile fields like id, createdAt, imageUrl, ipfsCid.
  const normalized = {
    title: String(incident.title || '').trim().toLowerCase(),
    description: String(incident.description || '').trim().toLowerCase(),
    category: String(incident.category || '').trim().toLowerCase(),
    location: String(incident.location || '').trim().toLowerCase(),
    latitude: typeof incident.latitude === 'number' ? Number(incident.latitude) : null,
    longitude: typeof incident.longitude === 'number' ? Number(incident.longitude) : null,
  };
  return JSON.stringify(normalized);
}

/**
 * Compute keccak256 hash of incident canonical representation
 * @param {object} incident
 * @returns {string} 0x-prefixed bytes32 hex string
 */
function computeIncidentHash(incident) {
  const canonical = buildCanonicalIncident(incident);
  return ethers.keccak256(ethers.toUtf8Bytes(canonical));
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
  return ethers.keccak256(ethers.toUtf8Bytes(geohash));
}

/**
 * Check if incident hash already exists on-chain
 * @param {string} incidentHash - keccak256 hash of incident
 * @returns {Promise<boolean>} true if hash already registered
 */
async function checkHashExists(incidentHash) {
  const rpcUrl = process.env.SEPOLIA_RPC_URL;
  const contractAddr = process.env.CONTRACT_ADDR;

  if (!rpcUrl || !contractAddr) {
    return false; // Skip check if not configured
  }

  try {
    const abiPath = path.join(__dirname, '..', 'contracts', 'IncidentRegistry.abi.json');
    const abi = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const contract = new ethers.Contract(contractAddr, abi, provider);
    
    const exists = await contract.isIncidentRegistered(incidentHash);
    return exists;
  } catch (error) {
    console.warn('Failed to check hash on-chain:', error.message);
    return false;
  }
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
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const contract = new ethers.Contract(contractAddr, abi, provider);
    
    const existingId = await contract.idByLocationKey(locationKey);
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

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  const contract = new ethers.Contract(contractAddr, abi, wallet);

  // Compute hash first and check for duplicates
  const hashHex = computeIncidentHash(incident);
  const hashExists = await checkHashExists(hashHex);
  
  if (hashExists) {
    throw new Error('DUPLICATE_INCIDENT: This issue already exists on blockchain');
  }

  // Generate location key and check for location duplicates
  const locationKey = generateLocationKey(incident.latitude, incident.longitude);
  const locationExists = await checkLocationExists(locationKey);
  
  if (locationExists) {
    throw new Error('ALREADY_REPORTED: An incident was already reported at this location');
  }

  // Hash already computed above, now register
  const ipfsCid = incident.ipfsCid || '';
  const title = String(incident.title || '').slice(0, 120);
  
  const tx = await contract.registerIncident(hashHex, title, ipfsCid, locationKey, { 
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
  const provider = new ethers.JsonRpcProvider(rpcUrl);
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
  checkHashExists,
  checkLocationExists,
  registerIncidentOnChain,
  verifyIncidentOnChain,
};


