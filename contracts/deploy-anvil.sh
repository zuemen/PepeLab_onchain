#!/bin/bash

# Load environment variables
source .env

# Run deployment script on Anvil
# We assume Anvil is already running at RPC_URL
# If not, run 'anvil' in another terminal
echo "Deploying to Anvil..."
forge script script/Deploy.s.sol:DeployScript --rpc-url $RPC_URL --broadcast --private-key $PRIVATE_KEY

# Note: In a real environment, you'd use a script to parse the broadcast JSON
# and export addresses. For this setup, we'll use a helper script or manual export.
