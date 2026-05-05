# PepeLab On-chain 鏈上合成資產跟單系統

## 專題簡介
本專題旨在開發一個去中心化的鏈上合成資產跟單系統。用戶可以透過此平台跟隨資深交易員的策略，自動進行合成資產的買賣。系統利用智能合約確保交易的透明性與安全性，並透過合成資產技術擴展可交易資產的種類。

## 技術棧
- **智能合約 (Smart Contracts):**
  - Foundry: 開發、測試與部署框架
  - Solidity: 合約編寫語言
- **前端 (Frontend):**
  - React + Vite: 前端框架與構建工具
  - TypeScript: 型別安全
  - Ethers.js v6: 與區塊鏈互動
  - Tailwind CSS: UI 樣式管理
  - React Router DOM: 頁面路由
  - Recharts: 數據可視化圖表
- **區塊鏈:**
  - Ethereum/EVM 相容鏈

## 目錄結構說明
```text
pepelab-onchain/
├── contracts/        # Foundry 專案，包含智能合約、測試與腳本
│   ├── src/          # 智能合約源代碼
│   ├── test/         # 合約測試腳本
│   ├── script/       # 部署腳本
│   └── lib/          # 外部依賴庫 (如 forge-std)
├── frontend/         # React 前端專案
│   ├── src/          # 前端源代碼 (Components, Hooks, Pages)
│   ├── public/       # 靜態資源
│   ├── tailwind.config.js # Tailwind 配置
│   └── package.json  # 前端依賴
├── README.md         # 專案說明文件
└── .gitignore        # Git 忽略檔案配置
```

## 快速開始
### 合約開發
```bash
cd contracts
forge build
forge test
```

### 前端開發
```bash
cd frontend
npm install
npm run dev
```
