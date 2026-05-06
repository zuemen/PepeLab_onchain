#!/bin/bash

# Load environment variables
if [ -f .env ]; then
  source .env
else
  echo ".env file not found"
  exit 1
fi

echo "Deploying to Sepolia..."

# Deploy and Verify
forge script script/Deploy.s.sol:DeployScript \
    --rpc-url $SEPOLIA_RPC_URL \
    --broadcast \
    --verify \
    --etherscan-api-key $ETHERSCAN_API_KEY \
    --private-key $PRIVATE_KEY \
    -vvvv

echo "Deployment complete."
