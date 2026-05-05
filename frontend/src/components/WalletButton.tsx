import React from 'react';

interface WalletButtonProps {
  address: string;
  connect: () => void;
}

const WalletButton: React.FC<WalletButtonProps> = ({ address, connect }) => {
  return (
    <button
      onClick={connect}
      className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-full font-semibold transition-all duration-200 shadow-md"
    >
      {address ? (
        <span className="font-mono">
          {address.slice(0, 6)}...{address.slice(-4)}
        </span>
      ) : (
        "Connect Wallet"
      )}
    </button>
  );
};

export default WalletButton;
