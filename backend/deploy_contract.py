from solcx import compile_standard, install_solc
from web3 import Web3
import json

# Install Solidity version
install_solc("0.8.17")

# Read contract
with open("/home/naren-root/Documents/Semester 7/Blockchain/Project/contract/CertificateRegistry.sol", "r") as f:
    contract_source = f.read()

# Compile
compiled_sol = compile_standard({
    "language": "Solidity",
    "sources": {"CertificateRegistry.sol": {"content": contract_source}},
    "settings": {"outputSelection": {"*": {"*": ["abi", "metadata", "evm.bytecode"]}}}
}, solc_version="0.8.17")

# Save ABI
abi = compiled_sol["contracts"]["CertificateRegistry.sol"]["CertificateRegistry"]["abi"]
bytecode = compiled_sol["contracts"]["CertificateRegistry.sol"]["CertificateRegistry"]["evm"]["bytecode"]["object"]

with open("certificate_abi.json", "w") as f:
    json.dump(abi, f)

print("ABI saved")

# Connect to Ganache
ganache_url = "http://127.0.0.1:7545"
w3 = Web3(Web3.HTTPProvider(ganache_url))
assert w3.is_connected(), "Ganache not connected"

# Use Ganache Account #0
private_key = "0x1f51b52e151acb1aa1b741eee1169ddb1aea48d9145d4d72bd1c35da2364027a"
account = w3.eth.account.from_key(private_key)

# Deploy contract
CertificateRegistry = w3.eth.contract(abi=abi, bytecode=bytecode)

nonce = w3.eth.get_transaction_count(account.address)

tx = CertificateRegistry.constructor().build_transaction({
    "from": account.address,
    "nonce": nonce,
    "gas": 4000000,
    "gasPrice": w3.to_wei("20", "gwei")
})

signed_tx = account.sign_transaction(tx)
tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)

tx_receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
print("Contract deployed at:", tx_receipt.contractAddress)
