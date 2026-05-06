import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ethers } from 'ethers';
import { useContracts } from '../hooks/useContracts';
import { 
  Loader2, 
  XCircle, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  BarChart3, 
  PieChart, 
  ArrowUpRight, 
  ArrowDownRight,
  RefreshCw
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const ASSETS = [
  { symbol: 'BTC', label: 'sBTC', hash: ethers.keccak256(ethers.toUtf8Bytes("BTC")) },
  { symbol: 'ETH', label: 'sETH', hash: ethers.keccak256(ethers.toUtf8Bytes("ETH")) },
  { symbol: 'AAPL', label: 'sAAPL', hash: ethers.keccak256(ethers.toUtf8Bytes("AAPL")) },
  { symbol: 'TSLA', label: 'sTSLA', hash: ethers.keccak256(ethers.toUtf8Bytes("TSLA")) },
];

interface PortfolioPageProps {
  address: string;
  signer: ethers.JsonRpcSigner | null;
}

const PortfolioPage: React.FC<PortfolioPageProps> = ({ address, signer }) => {
  const contracts = useContracts(signer);
  
  // Data State
  const [copyRecords, setCopyRecords] = useState<any[]>([]);
  const [openPositions, setOpenPositions] = useState<any[]>([]);
  const [freeMargin, setFreeMargin] = useState('0');
  const [prices, setPrices] = useState<Record<string, string>>({});
  
  // UI State
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchData = useCallback(async () => {
    if (!contracts || !address) return;
    
    try {
      const [_freeMargin, rawRecords, positionIds] = await Promise.all([
        contracts.exchange.freeMargin(address),
        contracts.tracker.getCopyRecords(address),
        contracts.exchange.getUserPositions(address),
      ]);

      setFreeMargin(ethers.formatUnits(_freeMargin, 18));

      // 1. Fetch Oracle Prices
      const priceMap: Record<string, string> = {};
      for (const asset of ASSETS) {
        try {
          const [price] = await contracts.oracle.getPrice(asset.hash);
          priceMap[asset.hash] = ethers.formatUnits(price, 18);
        } catch (e) {}
      }
      setPrices(priceMap);

      // 2. Process Copy Records
      const enrichedRecords = [];
      for (let i = 0; i < rawRecords.length; i++) {
        const r = rawRecords[i];
        if (r.active) {
            let currentValue = BigInt(0);
            for (const pid of r.positionIds) {
                const val = await contracts.exchange.getPositionValue(pid);
                currentValue += val;
            }
            
            const profile = await contracts.registry.traders(r.trader);
            const initial = parseFloat(ethers.formatUnits(r.initialAmount, 18));
            const current = parseFloat(ethers.formatUnits(currentValue, 18));
            const returnPct = ((current - initial) / initial) * 100;

            enrichedRecords.push({
                idx: i,
                traderName: profile.displayName,
                copiedAt: Number(r.copiedAt),
                initialAmount: initial,
                currentValue: current,
                returnPct: returnPct,
                positionIds: r.positionIds
            });
        }
      }
      setCopyRecords(enrichedRecords);

      // 3. Process All Open Positions
      const posDetails = [];
      for (const pid of positionIds) {
        const pos = await contracts.exchange.getPosition(pid);
        if (pos.isOpen) {
            const uPnl = await contracts.exchange.getUnrealizedPnL(pid);
            const val = await contracts.exchange.getPositionValue(pid);
            posDetails.push({
                id: pid.toString(),
                asset: pos.asset,
                isLong: pos.isLong,
                entryPrice: ethers.formatUnits(pos.entryPrice, 18),
                margin: ethers.formatUnits(pos.margin, 18),
                leverage: pos.leverage.toString(),
                unrealizedPnL: ethers.formatUnits(uPnl, 18),
                currentValue: ethers.formatUnits(val, 18)
            });
        }
      }
      setOpenPositions(posDetails.reverse());
      setLastUpdated(new Date());

    } catch (err) {
      console.error("Portfolio fetch failed", err);
    } finally {
      setLoading(false);
    }
  }, [contracts, address]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // 30s refresh
    return () => clearInterval(interval);
  }, [fetchData]);

  const unfollow = async (idx: number) => {
    setActionLoading(prev => ({ ...prev, [`unfollow-${idx}`]: true }));
    try {
      const tx = await contracts!.tracker.unfollowAndCloseAll(idx);
      await tx.wait();
      await fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(prev => ({ ...prev, [`unfollow-${idx}`]: false }));
    }
  };

  const withdraw = async () => {
    if (parseFloat(freeMargin) <= 0) return;
    setActionLoading(prev => ({ ...prev, withdraw: true }));
    try {
        const tx = await contracts!.exchange.withdrawMargin(ethers.parseUnits(freeMargin, 18));
        await tx.wait();
        await fetchData();
    } catch (err: any) {
        alert(err.message);
    } finally {
        setActionLoading(prev => ({ ...prev, withdraw: false }));
    }
  };

  // Chart Logic
  const totalPortfolioValue = useMemo(() => {
    const copyVal = copyRecords.reduce((sum, r) => sum + r.currentValue, 0);
    // Note: positions might overlap with copyRecords, but getUserPositions 
    // is all positions. To avoid double counting for the "Total", we sum 
    // freeMargin + value of all open positions.
    const posVal = openPositions.reduce((sum, p) => sum + parseFloat(p.currentValue), 0);
    return parseFloat(freeMargin) + posVal;
  }, [freeMargin, openPositions, copyRecords]);

  const initialInvestment = useMemo(() => {
    return copyRecords.reduce((sum, r) => sum + r.initialAmount, 0) + parseFloat(freeMargin);
  }, [copyRecords, freeMargin]);

  const chartData = [
    { name: 'Initial', value: initialInvestment },
    { name: 'Current', value: totalPortfolioValue }
  ];

  if (!address) return <div className="text-center py-20 text-slate-500 font-bold">Please connect wallet.</div>;

  return (
    <div className="space-y-10 pb-20">
      
      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Investment Portfolio</h2>
          <p className="text-slate-500 mt-1 flex items-center">
            <RefreshCw className={cn("w-3 h-3 mr-2", loading && "animate-spin")} />
            Auto-refreshing every 30s. Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        
        <div className="flex gap-4">
            <div className="bg-white px-6 py-4 rounded-2xl shadow-sm border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Available Margin</p>
                <div className="flex items-center gap-4">
                    <p className="text-2xl font-black text-slate-800">${parseFloat(freeMargin).toLocaleString()}</p>
                    <button 
                        onClick={withdraw}
                        disabled={actionLoading.withdraw || parseFloat(freeMargin) <= 0}
                        className="bg-slate-900 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-slate-800 disabled:opacity-30"
                    >
                        {actionLoading.withdraw ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Withdraw'}
                    </button>
                </div>
            </div>
            <div className="bg-slate-900 px-6 py-4 rounded-2xl shadow-xl text-white">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Total Equity</p>
                <p className="text-2xl font-black text-green-400">${totalPortfolioValue.toLocaleString()}</p>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Performance Chart */}
        <section className="lg:col-span-2 bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-800 mb-8 flex items-center">
                <BarChart3 className="w-5 h-5 mr-2 text-blue-500" /> Performance Overview
            </h3>
            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                        <defs>
                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 'bold'}} />
                        <YAxis hide domain={['dataMin - 100', 'dataMax + 100']} />
                        <Tooltip 
                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                            formatter={(value: number) => [`$${value.toLocaleString()}`, 'Value']}
                        />
                        <Area 
                            type="monotone" 
                            dataKey="value" 
                            stroke="#22c55e" 
                            strokeWidth={4}
                            fillOpacity={1} 
                            fill="url(#colorValue)" 
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
            <div className="mt-4 flex justify-center gap-8">
                <div className="flex items-center text-xs font-bold text-slate-400">
                    <div className="w-3 h-3 rounded-full bg-slate-200 mr-2"></div> Initial Principal
                </div>
                <div className="flex items-center text-xs font-bold text-green-500">
                    <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div> Current Equity
                </div>
            </div>
        </section>

        {/* Quick Summary */}
        <section className="lg:col-span-1 bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between">
            <h3 className="font-bold text-slate-800 mb-6 flex items-center">
                <PieChart className="w-5 h-5 mr-2 text-purple-500" /> Asset Distribution
            </h3>
            <div className="space-y-4">
                {ASSETS.map(asset => {
                    const amount = openPositions.filter(p => p.asset === asset.hash).length;
                    if (amount === 0) return null;
                    return (
                        <div key={asset.symbol} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                            <span className="font-bold text-slate-700">{asset.label}</span>
                            <span className="bg-slate-200 text-slate-600 px-2 py-1 rounded-lg text-[10px] font-black">{amount} POSITIONS</span>
                        </div>
                    )
                })}
                {openPositions.length === 0 && <p className="text-center text-slate-400 py-10">No active assets</p>}
            </div>
            <div className="pt-6 border-t border-slate-100 mt-6">
                <p className="text-xs font-bold text-slate-400 uppercase mb-2">Portfolio Return</p>
                <p className={cn(
                    "text-4xl font-black",
                    totalPortfolioValue >= initialInvestment ? "text-green-500" : "text-red-500"
                )}>
                    {totalPortfolioValue >= initialInvestment ? '+' : ''}
                    {(((totalPortfolioValue - initialInvestment) / (initialInvestment || 1)) * 100).toFixed(2)}%
                </p>
            </div>
        </section>

        {/* Copy Records Table */}
        <section className="lg:col-span-3 bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-8 border-b border-slate-100">
                <h3 className="text-xl font-bold text-slate-800">Copy Records</h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                            <th className="px-8 py-4">Trader / Time</th>
                            <th className="px-8 py-4">Initial Amount</th>
                            <th className="px-8 py-4">Current Value</th>
                            <th className="px-8 py-4">Return %</th>
                            <th className="px-8 py-4 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {copyRecords.length === 0 ? (
                            <tr><td colSpan={5} className="px-8 py-10 text-center text-slate-400 italic">No copy records.</td></tr>
                        ) : copyRecords.map(r => (
                            <tr key={r.idx} className="hover:bg-slate-50/30 transition">
                                <td className="px-8 py-6">
                                    <div className="font-bold text-slate-900">{r.traderName}</div>
                                    <div className="text-xs text-slate-400">Copied {new Date(r.copiedAt * 1000).toLocaleDateString()}</div>
                                </td>
                                <td className="px-8 py-6 font-mono font-bold text-slate-600">${r.initialAmount.toLocaleString()}</td>
                                <td className="px-8 py-6 font-mono font-black text-slate-800">${r.currentValue.toLocaleString()}</td>
                                <td className="px-8 py-6">
                                    <div className={cn(
                                        "inline-flex items-center px-2 py-1 rounded-lg font-black text-xs",
                                        r.returnPct >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                    )}>
                                        {r.returnPct >= 0 ? '+' : ''}{r.returnPct.toFixed(2)}%
                                    </div>
                                </td>
                                <td className="px-8 py-6 text-right">
                                    <button 
                                        onClick={() => unfollow(r.idx)}
                                        disabled={actionLoading[`unfollow-${r.idx}`]}
                                        className="text-red-500 hover:text-red-700 font-bold text-sm transition disabled:opacity-30"
                                    >
                                        {actionLoading[`unfollow-${r.idx}`] ? 'Closing...' : 'Unfollow'}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>

        {/* Detailed Positions Table */}
        <section className="lg:col-span-3 bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-8 border-b border-slate-100">
                <h3 className="text-xl font-bold text-slate-800">All Open Positions</h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                            <th className="px-8 py-4">Asset / Side</th>
                            <th className="px-4 py-4">Leverage</th>
                            <th className="px-4 py-4">Entry / Oracle</th>
                            <th className="px-4 py-4">Margin</th>
                            <th className="px-4 py-4">Unrealized PnL</th>
                            <th className="px-8 py-4 text-right">Current Value</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {openPositions.length === 0 ? (
                            <tr><td colSpan={6} className="px-8 py-10 text-center text-slate-400 italic">No open positions.</td></tr>
                        ) : openPositions.map(p => {
                            const asset = ASSETS.find(a => a.hash === p.asset);
                            const oraclePrice = prices[p.asset] || '0';
                            const pnl = parseFloat(p.unrealizedPnL);
                            
                            return (
                                <tr key={p.id} className="hover:bg-slate-50/30 transition">
                                    <td className="px-8 py-6">
                                        <div className="font-bold text-slate-900">{asset?.label}</div>
                                        <div className={cn(
                                            "text-[10px] font-black px-2 py-0.5 rounded inline-block",
                                            p.isLong ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                        )}>
                                            {p.isLong ? 'LONG' : 'SHORT'}
                                        </div>
                                    </td>
                                    <td className="px-4 py-6 font-mono font-bold text-slate-600">{p.leverage}x</td>
                                    <td className="px-4 py-6">
                                        <div className="text-sm font-bold text-slate-800">${parseFloat(p.entryPrice).toLocaleString()}</div>
                                        <div className="text-xs text-slate-400">${parseFloat(oraclePrice).toLocaleString()}</div>
                                    </td>
                                    <td className="px-4 py-6 font-mono font-bold text-slate-600">${parseFloat(p.margin).toLocaleString()}</td>
                                    <td className="px-4 py-6">
                                        <div className={cn(
                                            "font-black flex items-center",
                                            pnl >= 0 ? "text-green-600" : "text-red-600"
                                        )}>
                                            {pnl > 0 ? <ArrowUpRight className="w-4 h-4 mr-1" /> : pnl < 0 ? <ArrowDownRight className="w-4 h-4 mr-1" /> : null}
                                            ${pnl.toLocaleString()}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-right font-black text-slate-900">
                                        ${parseFloat(p.currentValue).toLocaleString()}
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </section>

      </div>
    </div>
  );
};

export default PortfolioPage;
