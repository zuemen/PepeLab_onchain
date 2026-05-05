import React from 'react';

interface LandingPageProps {
  connect: () => void;
  address: string;
}

const LandingPage: React.FC<LandingPageProps> = ({ connect, address }) => {
  return (
    <div className="space-y-20">
      {/* Hero Section */}
      <section className="text-center py-20 bg-gradient-to-b from-slate-900 to-slate-800 text-white rounded-3xl shadow-2xl overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-10 left-10 w-32 h-32 bg-green-500 rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-48 h-48 bg-blue-500 rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative z-10 px-6">
          <h2 className="text-5xl md:text-7xl font-extrabold mb-6 tracking-tight">
            On-Chain <span className="text-green-400">CFD</span> <br />
            Copy Trading PoC
          </h2>
          <p className="text-xl md:text-2xl text-slate-300 max-w-3xl mx-auto mb-10 leading-relaxed">
            The future of decentralized derivatives management. Follow expert strategies with synthetic asset automation.
          </p>
          {!address && (
            <button
              onClick={connect}
              className="bg-green-500 hover:bg-green-600 text-slate-900 px-10 py-4 rounded-full text-xl font-bold transition-all transform hover:scale-105 shadow-xl"
            >
              Start Trading Now
            </button>
          )}
        </div>
      </section>

      {/* Intro Section */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <div className="space-y-6">
          <h3 className="text-3xl font-bold text-slate-800">去中心化合成資產與跟單系統</h3>
          <p className="text-lg text-slate-600 leading-relaxed">
            PepeLab On-chain 是一個基於區塊鏈的合成衍生品 PoC。我們結合了鏈上預言機與差價合約 (CFD) 邏輯，
            讓用戶可以透過保證金交易 (Perpetual Exchange) 獲得多樣化資產的曝險，並透過策略註冊中心實現自動化跟單。
          </p>
          <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-r-lg">
            <h4 className="font-bold text-blue-800 mb-2">Key Features / 核心功能</h4>
            <ul className="list-disc list-inside text-blue-700 space-y-1">
              <li>Leveraged CFD Trading (Up to 5x)</li>
              <li>Multi-Asset Strategy Registry</li>
              <li>Automated One-Click Copy Trading</li>
              <li>Transparent On-Chain Settlements</li>
            </ul>
          </div>
        </div>
        <div className="bg-slate-200 aspect-video rounded-2xl flex items-center justify-center text-slate-400 text-5xl border-4 border-dashed border-slate-300">
           Chart Preview
        </div>
      </section>

      {/* Disclaimer */}
      <section className="bg-amber-50 border border-amber-200 p-8 rounded-2xl text-amber-800">
        <h4 className="text-xl font-bold mb-3 flex items-center">
          <span className="mr-2">⚠️</span> Disclaimer / 免責聲明
        </h4>
        <p className="text-sm md:text-base opacity-90">
          This project is a <strong>research prototype (PoC)</strong> developed for educational purposes. 
          It runs exclusively on local/test networks. No real assets are used, and the developers are not responsible 
          for any potential financial interactions. Please use MetaMask with testnet accounts only.
        </p>
        <p className="mt-2 text-sm md:text-base opacity-90 italic">
          本專題僅作為學術研究與概念驗證 (PoC) 使用。所有合約部署於測試網，不涉及真實資產，請勿投入任何具有價值的代幣。
        </p>
      </section>
    </div>
  );
};

export default LandingPage;
