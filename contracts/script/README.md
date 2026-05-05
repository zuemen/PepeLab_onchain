# Deployment Scripts

## Local Deployment (Anvil)
1. Start Anvil:
   ```bash
   anvil
   ```
2. Run the deployment script:
   ```bash
   ./deploy-anvil.sh
   ```
   Or manually:
   ```bash
   source .env
   forge script script/Deploy.s.sol:DeployScript --rpc-url $RPC_URL --broadcast --private-key $PRIVATE_KEY
   ```

## Files
- `Deploy.s.sol`: Main deployment logic using Foundry Scripts.
- `.env.example`: Template for environment variables.

## Post-Deployment
The script will output the addresses of:
- MockUSDC
- MockOracle
- PerpetualExchange
- StrategyRegistry
- CopyTracker

These addresses and their corresponding ABIs are exported to `frontend/src/contracts/` for the React application to use.
