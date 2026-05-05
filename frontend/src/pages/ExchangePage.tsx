import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useContracts } from '../hooks/useContracts';
import { Loader2, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Wallet, Activity } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ExchangePageProps {
  address: string;
  signer: ethers.JsonRpcSigner | null;
}

const ASSETS = [
  { symbol: 'BTC', label: 'sBTC', hash: ethers.keccak256(ethers.toUtf8Bytes("BTC")) },
  { symbol: 'ETH', label: 'sETH', hash: ethers.keccak256(ethers.toUtf8Bytes("ETH")) },
  { symbol: 'AAPL', label: 'sAAPL', hash: ethers.keccak256(ethers.toUtf8Bytes("AAPL")) },
  { symbol: 'TSLA', label: 'sTSLA', hash: ethers.keccak256(ethers.toUtf8Bytes("TSLA")) },
];

const ExchangePage: React.FC<ExchangePageProps> = ({ address, signer }) => {
  const contracts = useContracts(signer);
  
  // State
  const [usdcBalance, setUsdcBalance] = useState('0');
  const [freeMargin, setFreeMargin] = useState('0');
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [positions, setPositions] = useState<any[]>([]);
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  
  // Form State
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [selectedAsset, setSelectedAsset] = useState(ASSETS[0]);
  const [isLong, setIsLong] = useState(true);
  const [leverage, setLeverage] = useState(2);
  const [marginAmount, setMarginAmount] = useState('100');

  const fetchData = useCallback(async () => {
    if (!contracts || !address) return;

    try {
      const [balance, margin, pIds] = await Promise.all([
        contracts.usdc.balanceOf(address),
        contracts.exchange.freeMargin(address),
        contracts.exchange.getUserPositions(address),
      ]);

      setUsdcBalance(ethers.formatUnits(balance, 18));
      setFreeMargin(ethers.formatUnits(margin, 18));

      // Fetch prices
      const priceMap: Record<string, string> = {};
      for (const asset of ASSETS) {
        try {
          const [price] = await contracts.oracle.getPrice(asset.hash);
          priceMap[asset.symbol] = ethers.formatUnits(price, 18);
        } catch (e) {
          console.error(`Failed to fetch price for ${asset.symbol}`, e);
        }
      }
      setPrices(priceMap);

      // Fetch positions
      const posData = [];
      for (const id of pIds) {
        const pos = await contracts.exchange.getPosition(id);
        if (pos.isOpen) {
          const uPnl = await contracts.exchange.getUnrealizedPnL(id);
          posData.push({ 
            ...pos, 
            id: id.toString(), 
            unrealizedPnL: ethers.formatUnits(uPnl, 18) 
          });
        }
      }
      setPositions(posData.reverse());
    } catch (err) {
      console.error("Data fetch failed", err);
    }
  }, [contracts, address]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleAction = async (key: string, fn: () => Promise<void>) => {
    setLoading(prev => ({ ...prev, [key]: true }));
    try {
      await fn();
      await fetchData();
    } catch (err: any) {
      alert(err.reason || err.message || "Transaction failed");
    } finally {
      setLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  const faucet = () => handleAction('faucet', async () => {
    const tx = await contracts!.usdc.mint(address, ethers.parseUnits("1000", 18));
    await tx.wait();
  });

  const deposit = () => handleAction('deposit', async () => {
    const amount = ethers.parseUnits(depositAmount, 18);
    const allowance = await contracts!.usdc.allowance(address, await contracts!.exchange.getAddress());
    if (allowance < amount) {
      const tx1 = await contracts!.usdc.approve(await contracts!.exchange.getAddress(), amount);
      await tx1.wait();
    }
    const tx2 = await contracts!.exchange.depositMargin(amount);
    await tx2.wait();
    setDepositAmount('');
  });

  const withdraw = () => handleAction('withdraw', async () => {
    const tx = await contracts!.exchange.withdrawMargin(ethers.parseUnits(withdrawAmount, 18));
    await tx.wait();
    setWithdrawAmount('');
  });

  const openPosition = () => handleAction('open', async () => {
    const tx = await contracts!.exchange.openPosition(
      selectedAsset.hash,
      isLong,
      ethers.parseUnits(marginAmount, 18),
      leverage
    );
    await tx.wait();
  });

  const closePosition = (id: string) => handleAction(`close-${id}`, async () => {
    const tx = await contracts!.exchange.closePosition(id);
    await tx.wait();
  });

  if (!address) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl shadow-sm border border-slate-100">
        <Wallet className="w-16 h-16 text-slate-300 mb-4" />
        <h2 className="text-2xl font-bold text-slate-800">Wallet Not Connected</h2>
        <p className="text-slate-500">Please connect your wallet to access the exchange.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      
      {/* Left Column: Controls */}
      <div className="lg:col-span-1 space-y-8">
        
        {/* Faucet & Balance */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-slate-800 flex items-center">
              <Wallet className="w-5 h-5 mr-2 text-green-500" /> Faucet
            </h3>
            <span className="text-xs font-mono bg-slate-100 px-2 py-1 rounded text-slate-500">mUSDC (18 Decimals)</span>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <div>
                <p className="text-sm text-slate-500">mUSDC Balance</p>
                <p className="text-2xl font-bold text-slate-900">{parseFloat(usdcBalance).toLocaleString()} <span className="text-sm font-normal text-slate-400">USDC</span></p>
              </div>
              <button 
                onClick={faucet}
                disabled={loading.faucet}
                className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-800 disabled:opacity-50 flex items-center"
              >
                {loading.faucet && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Get 1,000
              </button>
            </div>
          </div>
        </section>

        {/* Margin Management */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="font-bold text-slate-800 mb-6 flex items-center">
            <Activity className="w-5 h-5 mr-2 text-blue-500" /> Margin Management
          </h3>
          <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
            <p className="text-xs text-blue-600 font-bold uppercase tracking-wider mb-1">Free Margin</p>
            <p className="text-3xl font-black text-blue-900">${parseFloat(freeMargin).toLocaleString()}</p>
          </div>
          
          <div className="space-y-6">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">Deposit USDC</label>
              <div className="flex gap-2">
                <input 
                  type="number" 
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="0.00"
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-green-500"
                />
                <button 
                  onClick={deposit}
                  disabled={loading.deposit || !depositAmount}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-700 disabled:opacity-50"
                >
                  {loading.deposit ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Deposit'}
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">Withdraw USDC</label>
              <div className="flex gap-2">
                <input 
                  type="number" 
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="0.00"
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button 
                  onClick={withdraw}
                  disabled={loading.withdraw || !withdrawAmount}
                  className="bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-bold hover:bg-slate-300 disabled:opacity-50"
                >
                  {loading.withdraw ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Withdraw'}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Open Position Form */}
        <section className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl">
          <h3 className="font-bold mb-6 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-green-400" /> Open New Position
          </h3>
          
          <div className="space-y-6">
            {/* Asset Selection */}
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase block mb-2">Select Asset</label>
              <select 
                value={selectedAsset.symbol}
                onChange={(e) => setSelectedAsset(ASSETS.find(a => a.symbol === e.target.value)!)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-500 font-bold"
              >
                {ASSETS.map(asset => (
                  <option key={asset.symbol} value={asset.symbol}>{asset.label} - ${prices[asset.symbol] || '0.00'}</option>
                ))}
              </select>
            </div>

            {/* Side Selection */}
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => setIsLong(true)}
                className={cn(
                  "py-3 rounded-xl font-black transition-all",
                  isLong ? "bg-green-500 text-slate-900 shadow-lg shadow-green-500/20" : "bg-slate-800 text-slate-400"
                )}
              >
                LONG
              </button>
              <button 
                onClick={() => setIsLong(false)}
                className={cn(
                  "py-3 rounded-xl font-black transition-all",
                  !isLong ? "bg-red-500 text-white shadow-lg shadow-red-500/20" : "bg-slate-800 text-slate-400"
                )}
              >
                SHORT
              </button>
            </div>

            {/* Leverage Selection */}
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase block mb-2">Leverage</label>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 5].map(l => (
                  <button 
                    key={l}
                    onClick={() => setLeverage(l)}
                    className={cn(
                      "py-2 rounded-lg font-mono font-bold border transition-all",
                      leverage === l ? "border-green-500 bg-green-500/10 text-green-400" : "border-slate-700 text-slate-500"
                    )}
                  >
                    {l}x
                  </button>
                ))}
              </div>
            </div>

            {/* Margin Input */}
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase block mb-2">Margin (USDC)</label>
              <input 
                type="number"
                value={marginAmount}
                onChange={(e) => setMarginAmount(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-500 font-mono text-xl"
              />
            </div>

            {/* Preview Info */}
            <div className="p-4 bg-slate-800 rounded-xl space-y-2 border border-slate-700">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Notional Value</span>
                <span className="font-bold text-white">${(parseFloat(marginAmount || '0') * leverage).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Entry Price (Est.)</span>
                <span className="font-bold text-white">${prices[selectedAsset.symbol] || '0.00'}</span>
              </div>
            </div>

            <button 
              onClick={openPosition}
              disabled={loading.open || !marginAmount || parseFloat(marginAmount) < 10}
              className="w-full bg-green-500 hover:bg-green-400 text-slate-900 py-4 rounded-xl font-black text-lg transition-all shadow-xl disabled:opacity-50 flex items-center justify-center"
            >
              {loading.open && <Loader2 className="w-6 h-6 mr-2 animate-spin" />}
              {parseFloat(marginAmount) < 10 ? 'Min. Margin $10' : `Open ${isLong ? 'Long' : 'Short'}`}
            </button>
          </div>
        </section>
      </div>

      {/* Right Column: Positions Table */}
      <div className="lg:col-span-2 space-y-8">
        <section className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-8 border-b border-slate-50">
            <h3 className="text-xl font-bold text-slate-800">My Active Positions</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                  <th className="px-8 py-4">Asset / Side</th>
                  <th className="px-4 py-4">Leverage</th>
                  <th className="px-4 py-4">Entry / Current</th>
                  <th className="px-4 py-4">Margin</th>
                  <th className="px-4 py-4 text-right">PnL (Unrealized)</th>
                  <th className="px-8 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {positions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-8 py-20 text-center text-slate-400 italic">
                      No active positions found.
                    </td>
                  </tr>
                ) : (
                  positions.map((pos) => {
                    const asset = ASSETS.find(a => a.hash === pos.asset);
                    const currentPrice = prices[asset?.symbol || ''] || '0';
                    const pnl = parseFloat(pos.unrealizedPnL);
                    
                    return (
                      <tr key={pos.id} className="hover:bg-slate-50/50 transition">
                        <td className="px-8 py-6">
                          <div className="font-bold text-slate-900">{asset?.label || 'Unknown'}</div>
                          <div className={cn(
                            "text-xs font-black px-2 py-0.5 rounded inline-block",
                            pos.isLong ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                          )}>
                            {pos.isLong ? 'LONG' : 'SHORT'}
                          </div>
                        </td>
                        <td className="px-4 py-6 font-mono font-bold text-slate-600">{pos.leverage.toString()}x</td>
                        <td className="px-4 py-6">
                          <div className="text-sm font-bold text-slate-800">${parseFloat(ethers.formatUnits(pos.entryPrice, 18)).toLocaleString()}</div>
                          <div className="text-xs text-slate-400">${parseFloat(currentPrice).toLocaleString()}</div>
                        </td>
                        <td className="px-4 py-6 text-sm font-mono text-slate-600">${parseFloat(ethers.formatUnits(pos.margin, 18)).toLocaleString()}</td>
                        <td className="px-4 py-6 text-right">
                          <div className={cn(
                            "font-black flex items-center justify-end",
                            pnl > 0 ? "text-green-600" : pnl < 0 ? "text-red-600" : "text-slate-400"
                          )}>
                            {pnl > 0 ? <ArrowUpRight className="w-4 h-4 mr-1" /> : pnl < 0 ? <ArrowDownRight className="w-4 h-4 mr-1" /> : null}
                            {pnl >= 0 ? '+' : ''}{pnl.toLocaleString()}
                          </div>
                          <div className="text-[10px] text-slate-400 font-bold">USDC</div>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <button 
                            onClick={() => closePosition(pos.id)}
                            disabled={loading[`close-${pos.id}`]}
                            className="bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-slate-800 disabled:opacity-50"
                          >
                            {loading[`close-${pos.id}`] ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Close'}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ExchangePage;
