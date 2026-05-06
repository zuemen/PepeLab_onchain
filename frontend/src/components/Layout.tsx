import React, { useState, useEffect } from 'react';
import WalletButton from './WalletButton';
import { Network, AlertTriangle, ShieldCheck } from 'lucide-react';
import { ethers } from 'ethers';

interface LayoutProps {
  children: React.ReactNode;
  address: string;
  connect: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, address, connect }) => {
  const [network, setNetwork] = useState<string>('');
  const [wrongNetwork, setWrongNetwork] = useState(false);

  useEffect(() => {
    const checkNetwork = async () => {
      if (window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const net = await provider.getNetwork();
        const cid = Number(net.chainId);
        setNetwork(net.name === 'unknown' ? `Chain ${cid}` : net.name);
        // Allow Anvil (31337) or Sepolia (11155111)
        setWrongNetwork(cid !== 31337 && cid !== 11155111);
      }
    };
    checkNetwork();
    if (window.ethereum) {
        window.ethereum.on('chainChanged', () => window.location.reload());
    }
  }, []);

  const switchNetwork = async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x7a69' }], // Anvil
      });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      
      {/* Disclaimer Banner */}
      <div className="bg-amber-500 text-slate-900 py-2 px-6 text-center text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2">
        <AlertTriangle className="w-4 h-4" />
        Research Prototype: No real assets. Testnet usage only.
        <AlertTriangle className="w-4 h-4" />
      </div>

      <header className="sticky top-0 z-50 bg-slate-900 text-white shadow-xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">🐸</span>
            <a href="/" className="text-2xl font-bold tracking-tight text-green-400 flex items-center">
              PepeLab <span className="text-white ml-1">On-chain</span>
            </a>
          </div>
          
          <nav className="hidden md:flex space-x-6 font-bold text-sm">
            <a href="/exchange" className="hover:text-green-400 transition">Exchange</a>
            <a href="/marketplace" className="hover:text-green-400 transition">Marketplace</a>
            <a href="/trader" className="hover:text-green-400 transition">Traders</a>
            <a href="/portfolio" className="hover:text-green-400 transition">Portfolio</a>
          </nav>

          <div className="flex items-center gap-4">
            {network && (
                <div className={cn(
                    "hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-black uppercase border",
                    wrongNetwork ? "border-red-500 text-red-500 bg-red-500/10" : "border-slate-700 text-slate-400 bg-slate-800"
                )}>
                    <Network className="w-3 h-3" />
                    {network}
                </div>
            )}
            {wrongNetwork && (
                <button onClick={switchNetwork} className="bg-red-600 text-white px-4 py-1.5 rounded-lg text-xs font-black hover:bg-red-700">
                    Switch to Anvil
                </button>
            )}
            <WalletButton address={address} connect={connect} />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12 flex-1 w-full">
        {children}
      </main>

      <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="flex items-center justify-center gap-2 text-white font-bold mb-4">
            <ShieldCheck className="w-5 h-5 text-green-400" />
            PepeLab Security PoC
          </div>
          <p>© 2026 On-chain Synthetic CFD Copy Trading. Built for Information Management Research.</p>
          <p className="mt-2 text-sm text-slate-500">Experimental Software. Use at your own risk.</p>
        </div>
      </footer>
    </div>
  );
};

function cn(...inputs: any[]) {
    return inputs.filter(Boolean).join(' ');
}

export default Layout;
