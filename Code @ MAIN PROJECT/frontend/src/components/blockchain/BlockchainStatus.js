import React, { useState, useEffect, useCallback } from 'react';
import { Shield, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

export default function BlockchainStatus({ issue }) {
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (issue?.chainHash) {
      verifyOnChain();
    }
  }, [issue, verifyOnChain]);

  const verifyOnChain = useCallback(async () => {
    if (!issue?.chainId) return;

    setLoading(true);
    try {
      // In a real implementation, this would call an API endpoint
      // For demo purposes, we'll simulate verification
      const response = await fetch(`/api/issues/${issue.id}/verify-blockchain`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        setVerificationStatus(result);
      }
    } catch (error) {
      console.error('Verification failed:', error);
      setVerificationStatus({ matches: false, error: 'Verification failed' });
    } finally {
      setLoading(false);
    }
  }, [issue?.chainId, issue?.id]);

  if (!issue?.chainHash) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Shield className="h-5 w-5 text-purple-600" />
          <span className="font-medium text-purple-900">Blockchain Verified</span>
        </div>

        {loading ? (
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-purple-600 border-t-transparent"></div>
        ) : verificationStatus ? (
          <div className="flex items-center space-x-1">
            {verificationStatus.matches ? (
              <>
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-700">Verified</span>
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4 text-red-600" />
                <span className="text-sm text-red-700">Unverified</span>
              </>
            )}
          </div>
        ) : (
          <button
            onClick={verifyOnChain}
            className="text-sm text-purple-600 hover:text-purple-700 font-medium"
          >
            Verify
          </button>
        )}
      </div>

      {issue.txHash && (
        <div className="mt-3 pt-3 border-t border-purple-200">
          <div className="text-xs text-gray-600 space-y-1">
            <div className="flex justify-between">
              <span>Transaction:</span>
              <a
                href={`https://sepolia.etherscan.io/tx/${issue.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-600 hover:text-purple-700 underline"
              >
                {issue.txHash.slice(0, 10)}...{issue.txHash.slice(-8)}
              </a>
            </div>
            {issue.blockNumber && (
              <div className="flex justify-between">
                <span>Block:</span>
                <span className="font-mono">{issue.blockNumber}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Hash:</span>
              <span className="font-mono text-xs">{issue.chainHash.slice(0, 16)}...</span>
            </div>
          </div>
        </div>
      )}

      {verificationStatus && !verificationStatus.matches && (
        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded flex items-center space-x-2">
          <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
          <span className="text-sm text-red-700">
            {verificationStatus.error || 'Blockchain verification failed'}
          </span>
        </div>
      )}
    </div>
  );
}
