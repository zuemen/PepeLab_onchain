import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import { useContracts } from '../hooks/useContracts';
import { 
  ArrowLeft, 
  Wallet, 
  Info, 
  ChevronRight, 
  CheckCircle2, 
  Loader2,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
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

interface CopyPageProps {
  address: string;
  signer: ethers.JsonRpcSigner | null;
}

const CopyPage: React.FC<CopyPageProps> = ({ address, signer }) => {
  const { traderAddress } = useParams();
  const navigate = useNavigate();
  const contracts = useContracts(signer);

  const [traderProfile, setTraderProfile] = useState<any>(null);
  const [strategy, setStrategy] = useState<any[]>([]);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [totalMargin, setTotalMargin] = useState('1000');
  const [allowance, setAllowance] = useState('0');
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const fetchData = useCallback(async () => {
    if (!contracts || !traderAddress || !address) return;
    try {
      const [profile, stratData, _allowance] = await Promise.all([
        contracts.registry.traders(traderAddress),
        contracts.registry.getLatestStrategy(traderAddress),
        contracts.usdc.allowance(address, await contracts.tracker.getAddress())
      ]);

      setTraderProfile(profile);
      setStrategy(stratData[0]);
      setAllowance(ethers.formatUnits(_allowance, 18));

      // Fetch current prices for preview
      const priceMap: Record<string, string> = {};
      for (const asset of ASSETS) {
        try {
          const [price] = await contracts.oracle.getPrice(asset.hash);
          priceMap[asset.symbol] = ethers.formatUnits(price, 18);
        } catch (e) {}
      }
      setPrices(priceMap);
    } catch (err) {
      console.error("Fetch failed", err);
    }
  }, [contracts, traderAddress, address]);

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

  const approveUSDC = () => handleAction('approve', async () => {
    const tx = await contracts!.usdc.approve(
        await contracts!.tracker.getAddress(), 
        ethers.parseUnits(totalMargin, 18)
    );
    await tx.wait();
  });

  const followTrader = () => handleAction('follow', async () => {
    const tx = await contracts!.tracker.followTrader(
        traderAddress, 
        ethers.parseUnits(totalMargin, 18)
    );
    await tx.wait();
    navigate('/portfolio');
  });

  if (!traderProfile) return (
    <div className="flex flex-col items-center justify-center py-40">
      <Loader2 className="w-12 h-12 text-slate-300 animate-spin" />
    </div>
  );

  const needsApproval = parseFloat(allowance) < (parseFloat(totalMargin) || 0);

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <button 
        onClick={() => navigate('/marketplace')}
        className="flex items-center text-slate-500 hover:text-slate-800 font-bold transition"
      >
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Marketplace
      </button>

      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center font-black text-2xl">
                {traderProfile.displayName[0].toUpperCase()}
            </div>
            <div>
                <h2 className="text-3xl font-black text-slate-900">Copy {traderProfile.displayName}</h2>
                <p className="text-slate-400 font-mono text-sm">{traderAddress}</p>
            </div>
        </div>
        <div className="text-right">
            <p className="text-[10px] font-black text-slate-400 uppercase">Strategy Version</p>
            <p className="text-2xl font-black text-slate-800">Latest</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Configuration */}
        <div className="md:col-span-1 space-y-8">
            <section className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl">
                <h3 className="font-bold mb-6 flex items-center">
                    <Wallet className="w-5 h-5 mr-2 text-green-400" /> Investment
                </h3>
                <div className="space-y-6">
                    <div>
                        <label className="text-xs font-black text-slate-400 uppercase block mb-2">Total Margin (USDC)</label>
                        <input 
                            type="number"
                            value={totalMargin}
                            onChange={(e) => setTotalMargin(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-4 outline-none focus:ring-2 focus:ring-green-500 font-mono text-2xl font-bold"
                        />
                    </div>

                    <div className="space-y-3">
                        <button 
                            onClick={approveUSDC}
                            disabled={!needsApproval || loading.approve || !totalMargin}
                            className={cn(
                                "w-full py-4 rounded-xl font-black transition-all flex items-center justify-center gap-2",
                                needsApproval 
                                    ? "bg-white text-slate-900 hover:bg-slate-100 shadow-lg" 
                                    : "bg-green-500/20 text-green-400 border border-green-500/30 cursor-default"
                            )}
                        >
                            {!needsApproval && <CheckCircle2 className="w-5 h-5" />}
                            {loading.approve && <Loader2 className="w-5 h-5 animate-spin" />}
                            1. Approve USDC
                        </button>
                        
                        <button 
                            onClick={followTrader}
                            disabled={needsApproval || loading.follow || !totalMargin}
                            className="w-full bg-green-500 hover:bg-green-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-900 py-4 rounded-xl font-black text-lg transition-all shadow-xl flex items-center justify-center gap-2"
                        >
                            {loading.follow && <Loader2 className="w-5 h-5 animate-spin" />}
                            2. Confirm & Copy
                        </button>
                    </div>
                </div>
            </section>

            <div className="bg-blue-50 border border-blue-100 p-6 rounded-3xl text-blue-800 flex gap-4">
                <Info className="w-6 h-6 shrink-0" />
                <p className="text-xs leading-relaxed font-medium">
                    Your funds will be split according to the trader's weights and used as margin for individual leveraged positions.
                </p>
            </div>
        </div>

        {/* Preview Table */}
        <div className="md:col-span-2 space-y-6">
            <section className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                    <h3 className="font-bold text-slate-800">Position Preview</h3>
                </div>
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                            <th className="px-6 py-4">Asset / Side</th>
                            <th className="px-6 py-4">Leverage</th>
                            <th className="px-6 py-4">Margin</th>
                            <th className="px-6 py-4 text-right">Notional</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {strategy.map((a, idx) => {
                            const asset = ASSETS.find(x => x.hash === a.asset);
                            const weight = Number(a.weight) / 10000;
                            const margin = (parseFloat(totalMargin) || 0) * weight;
                            const leverage = Number(a.leverage);
                            const notional = margin * leverage;

                            return (
                                <tr key={idx}>
                                    <td className="px-6 py-6">
                                        <div className="font-bold text-slate-900">{asset?.label}</div>
                                        <div className={cn(
                                            "text-[10px] font-black px-2 py-0.5 rounded inline-flex items-center",
                                            a.isLong ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                        )}>
                                            {a.isLong ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                                            {a.isLong ? 'LONG' : 'SHORT'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-6 font-mono font-bold text-slate-600">{leverage}x</td>
                                    <td className="px-6 py-6 font-black text-slate-800">${margin.toLocaleString()}</td>
                                    <td className="px-6 py-6 text-right font-black text-slate-900">
                                        ${notional.toLocaleString()}
                                        <div className="text-[10px] text-slate-400 font-bold uppercase">USDC</div>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </section>
        </div>

      </div>
    </div>
  );
};

export default CopyPage;
