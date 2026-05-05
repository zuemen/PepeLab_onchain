import { useMemo } from 'react';
import { ethers, ContractRunner } from 'ethers';
import { CONTRACT_ADDRESSES } from '../contracts/addresses';
import MockUSDCAbi from '../contracts/abi/MockUSDC.json';
import MockOracleAbi from '../contracts/abi/MockOracle.json';
import PerpetualExchangeAbi from '../contracts/abi/PerpetualExchange.json';
import StrategyRegistryAbi from '../contracts/abi/StrategyRegistry.json';
import CopyTrackerAbi from '../contracts/abi/CopyTracker.json';

export const useContracts = (runner: ContractRunner | null) => {
  return useMemo(() => {
    if (!runner) return null;

    return {
      usdc: new ethers.Contract(CONTRACT_ADDRESSES.MockUSDC, MockUSDCAbi, runner),
      oracle: new ethers.Contract(CONTRACT_ADDRESSES.MockOracle, MockOracleAbi, runner),
      exchange: new ethers.Contract(CONTRACT_ADDRESSES.PerpetualExchange, PerpetualExchangeAbi, runner),
      registry: new ethers.Contract(CONTRACT_ADDRESSES.StrategyRegistry, StrategyRegistryAbi, runner),
      tracker: new ethers.Contract(CONTRACT_ADDRESSES.CopyTracker, CopyTrackerAbi, runner),
    };
  }, [runner]);
};
