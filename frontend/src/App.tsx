import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';

// Components
const Header = ({ address, connect }: { address: string, connect: () => void }) => (
  <header className="flex justify-between items-center p-6 bg-slate-900 text-white shadow-lg">
    <div className="text-2xl font-bold text-green-400">PepeLab On-chain</div>
    <button 
      onClick={connect}
      className="bg-green-600 hover:bg-green-700 px-6 py-2 rounded-full font-semibold transition"
    >
      {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Connect Wallet'}
    </button>
  </header>
);

const Card = ({ title, value, children }: { title: string, value?: string, children?: React.ReactNode }) => (
  <div className="bg-white p-6 rounded-xl shadow-md border border-slate-100">
    <h3 className="text-slate-500 text-sm font-medium uppercase tracking-wider mb-2">{title}</h3>
    {value && <div className="text-3xl font-bold text-slate-800">{value}</div>}
    {children}
  </div>
);

function App() {
  const [address, setAddress] = useState('');
  const [poolValue, setPoolValue] = useState('0.00');
  const [userShares, setUserShares] = useState('0.00');

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.send("eth_requestAccounts", []);
        setAddress(accounts[0]);
      } catch (err) {
        console.error("Connection failed", err);
      }
    } else {
      alert("Please install MetaMask");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Header address={address} connect={connectWallet} />
      
      <main className="max-w-7xl mx-auto p-8">
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card title="Pool Total Value" value={`$ ${poolValue}`} />
          <Card title="My Shares" value={userShares} />
          <Card title="BTC Price" value="$ 50,000.00" />
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card title="Follower Actions">
            <div className="mt-4 space-y-4">
              <input 
                type="number" 
                placeholder="Amount (USDC)" 
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
              />
              <div className="grid grid-cols-2 gap-4">
                <button className="bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 transition">
                  Deposit
                </button>
                <button className="bg-slate-200 text-slate-700 py-3 rounded-lg font-bold hover:bg-slate-300 transition">
                  Withdraw
                </button>
              </div>
            </div>
          </Card>

          <Card title="Trader Control (BTC)">
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <span>Active Position:</span>
                <span className="font-mono font-bold">1.00 pBTC</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button className="bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition">
                  Open Long
                </button>
                <button className="bg-red-600 text-white py-3 rounded-lg font-bold hover:bg-red-700 transition">
                  Close Position
                </button>
              </div>
            </div>
          </Card>
        </section>
      </main>
    </div>
  );
}

export default App;
