# PepeLab On-Chain CFD Copy Trading Demo Script

This script outlines a 5-minute live demonstration flow.

## Preparation
1.  **Network**: Connect MetaMask to **Anvil** (Local) or **Sepolia**.
2.  **Accounts**: Prepare two accounts: **Trader** and **Follower**.
3.  **Start**: Open the Landing Page (`/`).

---

## 1. Trader Onboarding (1 min)
1.  **Connect**: Connect as **Trader**.
2.  **Register**: Navigate to **Traders** (`/trader`), enter "Pepe Master", and click **Register**.
3.  **Publish Strategy**:
    *   Add 3 rows:
        *   **sBTC** | **LONG** | **2x** | **50%**
        *   **sETH** | **SHORT** | **1x** | **30%**
        *   **sAAPL** | **LONG** | **1x** | **20%**
    *   Click **Publish Strategy** and confirm in MetaMask.
    *   Expand **Version History** to show the recorded strategy.

## 2. Follower Copying (1.5 min)
1.  **Switch Wallet**: Switch to **Follower** account.
2.  **Get Funds**: Navigate to **Exchange** (`/exchange`), click **Get 1,000 mUSDC**.
3.  **Deposit Margin**: Enter **500 USDC**, click **Deposit** (Approve + Deposit).
4.  **Marketplace**: Navigate to **Marketplace** (`/marketplace`).
5.  **Copy**: Click **Copy Strategy** for "Pepe Master".
6.  **Execute**:
    *   Total Margin: **1000 USDC**.
    *   Show the **Position Preview** (automated split).
    *   Click **Approve USDC** then **Confirm & Copy**.
    *   *Automatic redirect to Portfolio.*

## 3. Real-Time Tracking & Market Shift (1.5 min)
1.  **Portfolio View**: Navigate to **Portfolio** (`/portfolio`).
2.  **Show Positions**: Show the 3 automated positions (BTC, ETH, AAPL) with correct margins.
3.  **Market Shift**:
    *   Open **Admin Oracle** (`/admin/oracle`) in a new tab (switch back to Owner if needed, or allow any for demo).
    *   Update **sBTC** Price: **$50,000 → $60,000**.
    *   Update **sETH** Price: **$3,000 → $2,500**.
4.  **Observe PnL**: Go back to **Portfolio**. Observe the **Equity Chart** jump and **Return %** turn green.

## 4. Exit & Settlement (1 min)
1.  **Unfollow**: Click **Unfollow & Close All** in the Portfolio.
2.  **Verify**: Show that all 3 positions are closed and funds (with profit) are returned to **Available Margin**.
3.  **Conclusion**: Summary of on-chain transparency and automation.
