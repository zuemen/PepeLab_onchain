import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useContracts } from '../hooks/useContracts';
import { Loader2, ExternalLink, XCircle, TrendingUp, TrendingDown } from 'lucide-react';
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
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  const fetchPortfolio = useCallback(async () => {
    if (!contracts || !address) return;
    try {
      const data = await contracts.tracker.getCopyRecords(address);
      const enriched = [];
      for (let i = 0; i < data.length; i++) {
        const r = data[i];
        if (r.active) {
            const profile = await contracts.registry.traders(r.trader);
            enriched.push({ 
                ...r, 
                id: i, 
                displayName: profile.displayName 
            });
        }
      }
      setRecords(enriched.reverse());
    } catch (err) {
      console.error("Portfolio fetch failed", err);
    } finally {
      setLoading(false);
    }
  }, [contracts, address]);

  useEffect(() => {
    fetchPortfolio();
  }, [fetchPortfolio]);

  const unfollow = async (id: number) => {
    setActionLoading(prev => ({ ...prev, [id]: true }));
    try {
      const tx = await contracts!.tracker.unfollowAndCloseAll(id);
      await tx.wait();
      await fetchPortfolio();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  if (!address) return <div className="text-center py-20 text-slate-500 font-bold">Please connect wallet.</div>;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-4xl font-black text-slate-900 tracking-tight">My Portfolio</h2>
        <p className="text-slate-500 mt-2">Manage your active copy-trading positions and performance.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-10 h-10 text-green-500 animate-spin" />
        </div>
      ) : records.length === 0 ? (
        <div className="bg-white p-20 rounded-3xl text-center border border-dashed border-slate-200">
            <p className="text-slate-400 font-bold">You are not following any traders yet.</p>
            <a href="/marketplace" className="text-green-600 font-black mt-4 inline-block hover:underline">Explore Marketplace</a>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {records.map((r) => (
            <div key={r.id} className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-8 flex flex-col md:flex-row justify-between gap-6">
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center font-black text-2xl">
                            {r.displayName[0].toUpperCase()}
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-slate-900">Following {r.displayName}</h3>
                            <p className="text-slate-400 text-sm">Copied on {new Date(Number(r.copiedAt) * 1000).toLocaleDateString()}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-8">
                        <div className="text-right">
                            <p className="text-[10px] font-black text-slate-400 uppercase">Initial Margin</p>
                            <p className="text-xl font-black text-slate-800">${ethers.formatUnits(r.initialAmount, 18)}</p>
                        </div>
                        <button 
                            onClick={() => unfollow(r.id)}
                            disabled={actionLoading[r.id]}
                            className="bg-red-50 text-red-600 hover:bg-red-100 px-6 py-3 rounded-xl font-bold flex items-center transition-all disabled:opacity-50"
                        >
                            {actionLoading[r.id] ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />}
                            Unfollow & Close All
                        </button>
                    </div>
                </div>

                <div className="px-8 pb-8">
                    <div className="bg-slate-50 rounded-2xl p-4 flex flex-wrap gap-2">
                        {r.positionIds.map((pid: any) => (
                            <span key={pid} className="bg-white border border-slate-200 px-3 py-1 rounded-lg text-xs font-mono font-bold text-slate-600 flex items-center">
                                Position #{pid.toString()} <ExternalLink className="w-3 h-3 ml-1 text-slate-300" />
                            </span>
                        ))}
                    </div>
                </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PortfolioPage;
