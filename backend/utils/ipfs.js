// utils/ipfs.js - IPFS file upload using web3.storage
const fs = require('fs');
const { Web3Storage, File } = require('web3.storage');
const path = require('path');

// Initialize web3.storage client
function getClient() {
  if (!process.env.WEB3_STORAGE_TOKEN) {
    throw new Error('WEB3_STORAGE_TOKEN not configured');
  }
  return new Web3Storage({ token: process.env.WEB3_STORAGE_TOKEN });
}

/**
 * Upload a file to IPFS via web3.storage
 * @param {string} filePath - Path to the file to upload
 * @returns {Promise<{cid: string, url: string}>} - CID and gateway URL
 */
async function uploadFile(filePath) {
  try {
    const client = getClient();
    const data = fs.readFileSync(filePath);
    const fileName = path.basename(filePath);
    const file = new File([data], fileName);

    const cid = await client.put([file]);

    // Construct gateway URL
    const url = `https://${cid}.ipfs.dweb.link/${fileName}`;

    console.log(`File uploaded to IPFS: ${cid}`);
    return { cid, url };
  } catch (error) {
    console.error('IPFS upload error:', error);
    throw new Error(`Failed to upload file to IPFS: ${error.message}`);
  }
}

/**
 * Upload multiple files to IPFS
 * @param {string[]} filePaths - Array of file paths
 * @returns {Promise<{cid: string, url: string}[]>} - Array of CID and URL objects
 */
async function uploadFiles(filePaths) {
  try {
    const client = getClient();
    const files = filePaths.map(filePath => {
      const data = fs.readFileSync(filePath);
      const fileName = path.basename(filePath);
      return new File([data], fileName);
    });

    const cid = await client.put(files);

    const results = filePaths.map(filePath => {
      const fileName = path.basename(filePath);
      const url = `https://${cid}.ipfs.dweb.link/${fileName}`;
      return { cid, url };
    });

    console.log(`Files uploaded to IPFS: ${cid}`);
    return results;
  } catch (error) {
    console.error('IPFS batch upload error:', error);
    throw new Error(`Failed to upload files to IPFS: ${error.message}`);
  }
}

module.exports = { uploadFile, uploadFiles };