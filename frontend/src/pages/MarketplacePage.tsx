import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useContracts } from '../hooks/useContracts';
import { useNavigate } from 'react-router-dom';
import { Users, ShieldCheck, ArrowRight, Loader2, Search } from 'lucide-react';
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

interface MarketplacePageProps {
  address: string;
  signer: ethers.JsonRpcSigner | null;
}

const MarketplacePage: React.FC<MarketplacePageProps> = ({ address, signer }) => {
  const contracts = useContracts(signer);
  const navigate = useNavigate();
  const [traders, setTraders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTraders = useCallback(async () => {
    if (!contracts) return;
    setLoading(true);
    try {
      const list = await contracts.registry.getAllTraders();
      const traderData = [];

      for (const tAddr of list) {
        const [profile, strategyData, followerCount] = await Promise.all([
          contracts.registry.traders(tAddr),
          contracts.registry.getLatestStrategy(tAddr).catch(() => null),
          contracts.tracker.getFollowerCount(tAddr)
        ]);

        if (strategyData) {
          const [allocations] = strategyData;
          const strategySummary = allocations.map((a: any) => {
            const asset = ASSETS.find(x => x.hash === a.asset);
            return `${a.isLong ? 'L' : 'S'} ${asset?.label} ${Number(a.weight) / 100}% ${a.leverage}x`;
          }).join(' | ');

          traderData.push({
            address: tAddr,
            displayName: profile.displayName,
            summary: strategySummary,
            followers: followerCount.toString(),
          });
        }
      }
      setTraders(traderData);
    } catch (err) {
      console.error("Failed to fetch marketplace", err);
    } finally {
      setLoading(false);
    }
  }, [contracts]);

  useEffect(() => {
    fetchTraders();
  }, [fetchTraders]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-40">
      <Loader2 className="w-12 h-12 text-green-500 animate-spin mb-4" />
      <p className="text-slate-500 font-bold">Loading Marketplace...</p>
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Marketplace</h2>
          <p className="text-slate-500 mt-2">Discover top traders and copy their battle-tested strategies.</p>
        </div>
        <div className="relative">
           <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
           <input 
            type="text" 
            placeholder="Search traders..." 
            className="bg-white border border-slate-200 rounded-full pl-12 pr-6 py-3 outline-none focus:ring-2 focus:ring-green-500 min-w-[320px] shadow-sm"
           />
        </div>
      </div>

      <section className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-xs font-black uppercase tracking-wider">
              <th className="px-8 py-6">Trader</th>
              <th className="px-8 py-6">Current Strategy</th>
              <th className="px-8 py-6">Followers</th>
              <th className="px-8 py-6 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {traders.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-8 py-20 text-center text-slate-400 italic">
                  No active traders found.
                </td>
              </tr>
            ) : (
              traders.map((t) => (
                <tr key={t.address} className="hover:bg-slate-50/50 transition group">
                  <td className="px-8 py-8">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center font-black text-xl">
                        {t.displayName[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="font-black text-slate-900 text-lg flex items-center">
                          {t.displayName} <ShieldCheck className="w-4 h-4 ml-1 text-blue-500" />
                        </div>
                        <div className="text-xs font-mono text-slate-400">{t.address.slice(0, 10)}...</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-8">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 max-w-md">
                      <p className="text-xs font-mono text-slate-600 leading-relaxed">{t.summary}</p>
                    </div>
                  </td>
                  <td className="px-8 py-8">
                    <div className="flex items-center text-slate-700 font-bold">
                      <Users className="w-4 h-4 mr-2 text-slate-400" /> {t.followers}
                    </div>
                  </td>
                  <td className="px-8 py-8 text-right">
                    <button 
                      onClick={() => navigate(`/copy/${t.address}`)}
                      className="bg-green-500 hover:bg-green-600 text-slate-900 px-6 py-3 rounded-xl font-black transition-all flex items-center justify-center ml-auto group-hover:scale-105 shadow-lg shadow-green-500/10"
                    >
                      Copy Strategy <ArrowRight className="w-4 h-4 ml-2" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
};

export default MarketplacePage;
