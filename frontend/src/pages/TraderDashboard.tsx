import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useContracts } from '../hooks/useContracts';
import { 
  Plus, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  Send, 
  UserPlus, 
  History, 
  AlertCircle,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface TraderDashboardProps {
  address: string;
  signer: ethers.JsonRpcSigner | null;
}

const ASSETS = [
  { symbol: 'BTC', label: 'sBTC', hash: ethers.keccak256(ethers.toUtf8Bytes("BTC")) },
  { symbol: 'ETH', label: 'sETH', hash: ethers.keccak256(ethers.toUtf8Bytes("ETH")) },
  { symbol: 'AAPL', label: 'sAAPL', hash: ethers.keccak256(ethers.toUtf8Bytes("AAPL")) },
  { symbol: 'TSLA', label: 'sTSLA', hash: ethers.keccak256(ethers.toUtf8Bytes("TSLA")) },
];

interface AllocationRow {
  id: string;
  asset: typeof ASSETS[0];
  isLong: boolean;
  leverage: number;
  weight: string; // in percentage
}

const TraderDashboard: React.FC<TraderDashboardProps> = ({ address, signer }) => {
  const contracts = useContracts(signer);
  
  // Profile State
  const [profile, setProfile] = useState<{ isRegistered: boolean; displayName: string } | null>(null);
  const [registerName, setRegisterName] = useState('');
  
  // Strategy Builder State
  const [rows, setRows] = useState<AllocationRow[]>([
    { id: Math.random().toString(), asset: ASSETS[0], isLong: true, leverage: 2, weight: '100' }
  ]);
  
  // History State
  const [history, setHistory] = useState<any[]>([]);
  const [expandedVersion, setExpandedVersion] = useState<number | null>(null);
  
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const fetchData = useCallback(async () => {
    if (!contracts || !address) return;
    try {
      // Profile
      const p = await contracts.registry.traders(address);
      setProfile({ isRegistered: p.isRegistered, displayName: p.displayName });

      // History
      const count = await contracts.registry.getStrategyCount(address);
      const versions = [];
      for (let i = 0; i < Number(count); i++) {
        const [allocs, createdAt] = await contracts.registry.getStrategyVersion(address, i);
        versions.push({ id: i, allocations: allocs, createdAt: Number(createdAt) });
      }
      setHistory(versions.reverse());
    } catch (err) {
      console.error("Fetch failed", err);
    }
  }, [contracts, address]);

  useEffect(() => {
    fetchData();
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

  // Profile Actions
  const register = () => handleAction('register', async () => {
    const tx = await contracts!.registry.registerTrader(registerName);
    await tx.wait();
  });

  // Strategy Builder Actions
  const addRow = () => {
    setRows([...rows, { id: Math.random().toString(), asset: ASSETS[0], isLong: true, leverage: 1, weight: '0' }]);
  };

  const removeRow = (id: string) => {
    if (rows.length > 1) setRows(rows.filter(r => r.id !== id));
  };

  const updateRow = (id: string, updates: Partial<AllocationRow>) => {
    setRows(rows.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  const totalWeight = rows.reduce((sum, r) => sum + (parseFloat(r.weight) || 0), 0);
  const isValid = totalWeight === 100 && rows.every(r => parseFloat(r.weight) > 0);

  const publish = () => handleAction('publish', async () => {
    const allocs = rows.map(r => ({
      asset: r.asset.hash,
      weight: Math.round(parseFloat(r.weight) * 100), // to bps
      isLong: r.isLong,
      leverage: r.leverage
    }));
    const tx = await contracts!.registry.publishStrategy(allocs);
    await tx.wait();
  });

  if (!address) return <div className="text-center py-20 text-slate-500 font-bold">Please connect wallet.</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-12">
      
      {/* Profile Section */}
      <section className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
        {!profile?.isRegistered ? (
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <div className="bg-green-100 p-4 rounded-2xl">
              <UserPlus className="w-8 h-8 text-green-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-slate-800">Become a Trader</h2>
              <p className="text-slate-500">Register your profile to start publishing copy-trading strategies.</p>
            </div>
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Display Name"
                value={registerName}
                onChange={(e) => setRegisterName(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-500 min-w-[240px]"
              />
              <button 
                onClick={register}
                disabled={loading.register || !registerName}
                className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-800 disabled:opacity-50 flex items-center"
              >
                {loading.register && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Register
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white text-2xl font-black">
              {profile.displayName[0].toUpperCase()}
            </div>
            <div>
              <h2 className="text-3xl font-black text-slate-900">{profile.displayName}</h2>
              <div className="flex items-center text-green-600 font-bold text-sm mt-1">
                <CheckCircle2 className="w-4 h-4 mr-1" /> Verified Trader
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Strategy Builder */}
      {profile?.isRegistered && (
        <section className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-8 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
            <h3 className="text-xl font-bold text-slate-800 flex items-center">
              <Send className="w-5 h-5 mr-2 text-blue-500" /> Publish New Strategy
            </h3>
            <div className={cn(
              "px-4 py-1 rounded-full text-sm font-black",
              totalWeight === 100 ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
            )}>
              Total Weight: {totalWeight}%
            </div>
          </div>

          <div className="p-8 space-y-4">
            {rows.map((row) => (
              <div key={row.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                <div className="md:col-span-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Asset</label>
                  <select 
                    value={row.asset.symbol}
                    onChange={(e) => updateRow(row.id, { asset: ASSETS.find(a => a.symbol === e.target.value)! })}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold"
                  >
                    {ASSETS.map(a => <option key={a.symbol} value={a.symbol}>{a.label}</option>)}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Side</label>
                  <div className="flex bg-white rounded-lg p-1 border border-slate-200">
                    <button 
                      onClick={() => updateRow(row.id, { isLong: true })}
                      className={cn("flex-1 text-[10px] font-black py-1 rounded", row.isLong ? "bg-green-500 text-white" : "text-slate-400")}
                    >LONG</button>
                    <button 
                      onClick={() => updateRow(row.id, { isLong: false })}
                      className={cn("flex-1 text-[10px] font-black py-1 rounded", !row.isLong ? "bg-red-500 text-white" : "text-slate-400")}
                    >SHORT</button>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Leverage</label>
                  <select 
                    value={row.leverage}
                    onChange={(e) => updateRow(row.id, { leverage: Number(e.target.value) })}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold"
                  >
                    {[1, 2, 5].map(l => <option key={l} value={l}>{l}x</option>)}
                  </select>
                </div>

                <div className="md:col-span-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Weight (%)</label>
                  <input 
                    type="number" 
                    value={row.weight}
                    onChange={(e) => updateRow(row.id, { weight: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold"
                  />
                </div>

                <div className="md:col-span-2 flex justify-end">
                  <button 
                    onClick={() => removeRow(row.id)}
                    className="p-2 text-slate-300 hover:text-red-500 transition"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}

            <div className="flex justify-between items-center pt-4">
              <button 
                onClick={addRow}
                className="flex items-center text-sm font-bold text-blue-600 hover:text-blue-700"
              >
                <Plus className="w-4 h-4 mr-1" /> Add Asset
              </button>

              <button 
                onClick={publish}
                disabled={!isValid || loading.publish}
                className="bg-slate-900 text-white px-10 py-3 rounded-xl font-bold hover:bg-slate-800 disabled:opacity-50 flex items-center"
              >
                {loading.publish && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
                Publish Strategy
              </button>
            </div>

            {!isValid && totalWeight !== 0 && (
              <div className="mt-4 flex items-center text-xs font-bold text-amber-600 bg-amber-50 p-3 rounded-lg">
                <AlertCircle className="w-4 h-4 mr-2" />
                Error: Total weight must be exactly 100%. Current: {totalWeight}%
              </div>
            )}
          </div>
        </section>
      )}

      {/* Strategy History */}
      {profile?.isRegistered && (
        <section className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-8 border-b border-slate-100">
            <h3 className="text-xl font-bold text-slate-800 flex items-center">
              <History className="w-5 h-5 mr-2 text-slate-400" /> Strategy Version History
            </h3>
          </div>
          
          <div className="divide-y divide-slate-50">
            {history.length === 0 ? (
              <div className="p-20 text-center text-slate-400 italic">No history found.</div>
            ) : history.map((ver) => (
              <div key={ver.id} className="group">
                <button 
                  onClick={() => setExpandedVersion(expandedVersion === ver.id ? null : ver.id)}
                  className="w-full p-6 flex justify-between items-center hover:bg-slate-50 transition"
                >
                  <div className="flex items-center gap-4">
                    <span className="bg-slate-900 text-white w-8 h-8 rounded-lg flex items-center justify-center font-mono text-xs font-bold">
                      v{ver.id + 1}
                    </span>
                    <div className="text-left">
                      <p className="font-bold text-slate-800">Version {ver.id}</p>
                      <p className="text-xs text-slate-400">{new Date(ver.createdAt * 1000).toLocaleString()}</p>
                    </div>
                  </div>
                  {expandedVersion === ver.id ? <ChevronUp /> : <ChevronDown />}
                </button>
                
                {expandedVersion === ver.id && (
                  <div className="px-8 pb-8 animate-in slide-in-from-top-2 duration-200">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-[10px] font-black text-slate-400 uppercase border-b border-slate-100">
                          <th className="py-2 text-left">Asset</th>
                          <th className="py-2 text-left">Side</th>
                          <th className="py-2 text-left">Leverage</th>
                          <th className="py-2 text-right">Weight</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ver.allocations.map((a: any, idx: number) => {
                          const asset = ASSETS.find(x => x.hash === a.asset);
                          return (
                            <tr key={idx} className="border-b border-slate-50 last:border-0">
                              <td className="py-3 font-bold text-slate-700">{asset?.label || '???'}</td>
                              <td className="py-3">
                                <span className={cn("text-[10px] font-black px-2 py-0.5 rounded", a.isLong ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                                  {a.isLong ? 'LONG' : 'SHORT'}
                                </span>
                              </td>
                              <td className="py-3 font-mono">{a.leverage.toString()}x</td>
                              <td className="py-3 text-right font-black text-slate-900">{Number(a.weight) / 100}%</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default TraderDashboard;
