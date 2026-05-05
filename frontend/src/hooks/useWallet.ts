import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';

export const useWallet = () => {
  const [address, setAddress] = useState<string>('');
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);

  const connectWallet = useCallback(async () => {
    if (window.ethereum) {
      try {
        const _provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await _provider.send("eth_requestAccounts", []);
        const _signer = await _provider.getSigner();
        
        setProvider(_provider);
        setSigner(_signer);
        setAddress(accounts[0]);
      } catch (err) {
        console.error("User denied account access", err);
      }
    } else {
      alert("MetaMask not detected. Please install it.");
    }
  }, []);

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length > 0) {
          setAddress(accounts[0]);
        } else {
          setAddress('');
          setSigner(null);
        }
      });
    }
  }, []);

  return { address, signer, provider, connectWallet };
};
