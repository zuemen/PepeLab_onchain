import React from 'react';
import WalletButton from './WalletButton';

interface LayoutProps {
  children: React.ReactNode;
  address: string;
  connect: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, address, connect }) => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <header className="sticky top-0 z-50 bg-slate-900 text-white shadow-xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">🐸</span>
            <h1 className="text-2xl font-bold tracking-tight text-green-400">
              PepeLab <span className="text-white">On-chain</span>
            </h1>
          </div>
          <nav className="hidden md:flex space-x-8 font-medium">
            <a href="/" className="hover:text-green-400 transition">Home</a>
            <a href="#" className="text-slate-400 cursor-not-allowed">Dashboard</a>
            <a href="#" className="text-slate-400 cursor-not-allowed">Traders</a>
          </nav>
          <WalletButton address={address} connect={connect} />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        {children}
      </main>

      <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p>© 2026 PepeLab On-chain CFD Copy Trading System. All rights reserved.</p>
          <p className="mt-2 text-sm text-slate-500">Built for Research & Development (PoC).</p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
