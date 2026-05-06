import { useMemo, useState, useEffect } from 'react';
import { ethers, ContractRunner } from 'ethers';
import { CONTRACT_ADDRESSES } from '../contracts/addresses';
import MockUSDCAbi from '../contracts/abi/MockUSDC.json';
import MockOracleAbi from '../contracts/abi/MockOracle.json';
import PerpetualExchangeAbi from '../contracts/abi/PerpetualExchange.json';
import StrategyRegistryAbi from '../contracts/abi/StrategyRegistry.json';
import CopyTrackerAbi from '../contracts/abi/CopyTracker.json';

export const useContracts = (runner: ContractRunner | null) => {
  const [chainId, setChainId] = useState<number>(31337);

  useEffect(() => {
    const getChainId = async () => {
      if (window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const network = await provider.getNetwork();
        setChainId(Number(network.chainId));
      }
    };
    getChainId();
    
    if (window.ethereum) {
        window.ethereum.on('chainChanged', () => window.location.reload());
    }
  }, []);

  return useMemo(() => {
    if (!runner) return null;
    const addresses = CONTRACT_ADDRESSES[chainId] || CONTRACT_ADDRESSES[31337];

    return {
      usdc: new ethers.Contract(addresses.MockUSDC, MockUSDCAbi, runner),
      oracle: new ethers.Contract(addresses.MockOracle, MockOracleAbi, runner),
      exchange: new ethers.Contract(addresses.PerpetualExchange, PerpetualExchangeAbi, runner),
      registry: new ethers.Contract(addresses.StrategyRegistry, StrategyRegistryAbi, runner),
      tracker: new ethers.Contract(addresses.CopyTracker, CopyTrackerAbi, runner),
    };
  }, [runner, chainId]);
};
