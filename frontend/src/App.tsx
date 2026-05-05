import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import LandingPage from './pages/LandingPage';
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
          {/* Add more routes like /dashboard or /traders here later */}
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
