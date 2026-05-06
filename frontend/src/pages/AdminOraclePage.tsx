import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useContracts } from '../hooks/useContracts';
import { RefreshCw, TrendingUp, Clock, ShieldAlert, Loader2 } from 'lucide-react';
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

interface AdminOraclePageProps {
  address: string;
  signer: ethers.JsonRpcSigner | null;
}

const AdminOraclePage: React.FC<AdminOraclePageProps> = ({ address, signer }) => {
  const contracts = useContracts(signer);
  const [prices, setPrices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updateLoading, setUpdateLoading] = useState<Record<string, boolean>>({});
  const [newPrices, setNewPrices] = useState<Record<string, string>>({});

  const fetchPrices = useCallback(async () => {
    if (!contracts) return;
    setLoading(true);
    try {
      const data = [];
      for (const asset of ASSETS) {
        try {
          const [price, updatedAt] = await contracts.oracle.getPrice(asset.hash);
          data.push({
            ...asset,
            price: ethers.formatUnits(price, 18),
            updatedAt: Number(updatedAt)
          });
        } catch (e) {
          data.push({ ...asset, price: '0', updatedAt: 0 });
        }
      }
      setPrices(data);
    } catch (err) {
      console.error("Failed to fetch oracle prices", err);
    } finally {
      setLoading(false);
    }
  }, [contracts]);

  useEffect(() => {
    fetchPrices();
  }, [fetchPrices]);

  const updatePrice = async (symbol: string, hash: string) => {
    const newPriceStr = newPrices[symbol];
    if (!newPriceStr) return;
    
    setUpdateLoading(prev => ({ ...prev, [symbol]: true }));
    try {
      const tx = await contracts!.oracle.updatePrice(hash, ethers.parseUnits(newPriceStr, 18));
      await tx.wait();
      await fetchPrices();
      setNewPrices(prev => ({ ...prev, [symbol]: '' }));
    } catch (err: any) {
      alert(err.reason || err.message);
    } finally {
      setUpdateLoading(prev => ({ ...prev, [symbol]: false }));
    }
  };

  if (!address) return <div className="text-center py-20">Please connect owner wallet.</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between bg-amber-50 border border-amber-200 p-6 rounded-3xl text-amber-800">
        <div className="flex gap-4 items-center">
            <ShieldAlert className="w-8 h-8" />
            <div>
                <h2 className="text-xl font-black">Oracle Administration</h2>
                <p className="text-sm font-medium opacity-80">This control panel is for manual price updates during PoC testing.</p>
            </div>
        </div>
        <button onClick={fetchPrices} className="p-2 hover:bg-amber-100 rounded-full transition">
            <RefreshCw className={cn("w-5 h-5", loading && "animate-spin")} />
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left">
            <thead>
                <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    <th className="px-8 py-6">Asset</th>
                    <th className="px-8 py-6">Current Price</th>
                    <th className="px-8 py-6">Last Updated</th>
                    <th className="px-8 py-6 text-right">New Price & Action</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
                {prices.map((p) => (
                    <tr key={p.symbol} className="hover:bg-slate-50/50 transition">
                        <td className="px-8 py-8">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black">
                                    {p.symbol[0]}
                                </div>
                                <div className="font-black text-slate-800">{p.label}</div>
                            </div>
                        </td>
                        <td className="px-8 py-8">
                            <div className="flex items-center text-xl font-black text-slate-900">
                                <TrendingUp className="w-4 h-4 mr-2 text-green-500" />
                                ${parseFloat(p.price).toLocaleString()}
                            </div>
                        </td>
                        <td className="px-8 py-8">
                            <div className="flex items-center text-slate-500 text-sm font-bold">
                                <Clock className="w-4 h-4 mr-2" />
                                {p.updatedAt === 0 ? 'Never' : new Date(p.updatedAt * 1000).toLocaleTimeString()}
                            </div>
                        </td>
                        <td className="px-8 py-8">
                            <div className="flex gap-2 justify-end">
                                <input 
                                    type="number"
                                    placeholder="0.00"
                                    value={newPrices[p.symbol] || ''}
                                    onChange={(e) => setNewPrices(prev => ({ ...prev, [p.symbol]: e.target.value }))}
                                    className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-slate-900 w-32 font-mono text-sm"
                                />
                                <button 
                                    onClick={() => updatePrice(p.symbol, p.hash)}
                                    disabled={updateLoading[p.symbol] || !newPrices[p.symbol]}
                                    className="bg-slate-900 text-white px-6 py-2 rounded-xl font-bold hover:bg-slate-800 disabled:opacity-30 transition-all flex items-center"
                                >
                                    {updateLoading[p.symbol] ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update'}
                                </button>
                            </div>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminOraclePage;
