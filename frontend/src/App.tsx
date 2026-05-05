import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import LandingPage from './pages/LandingPage';
import ExchangePage from './pages/ExchangePage';
import TraderDashboard from './pages/TraderDashboard';
import MarketplacePage from './pages/MarketplacePage';
import CopyPage from './pages/CopyPage';
import PortfolioPage from './pages/PortfolioPage';
import { useWallet } from './hooks/useWallet';
import { useContracts } from './hooks/useContracts';

function App() {
  const { address, signer, connectWallet } = useWallet();
  // Initialize contracts with the signer when connected
  const contracts = useContracts(signer);

  return (
    <Router>
      <Layout address={address} connect={connectWallet}>
        <Routes>
          <Route path="/" element={<LandingPage address={address} connect={connectWallet} />} />
          <Route path="/exchange" element={<ExchangePage address={address} signer={signer} />} />
          <Route path="/trader" element={<TraderDashboard address={address} signer={signer} />} />
          <Route path="/marketplace" element={<MarketplacePage address={address} signer={signer} />} />
          <Route path="/copy/:traderAddress" element={<CopyPage address={address} signer={signer} />} />
          <Route path="/portfolio" element={<PortfolioPage address={address} signer={signer} />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
