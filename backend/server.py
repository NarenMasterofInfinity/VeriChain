import hashlib
import json
import logging
import os
from datetime import datetime

import requests
from dotenv import load_dotenv
from pathlib import Path

from flask import Flask, request, jsonify, redirect
from web3 import Web3

load_dotenv()

app = Flask(__name__)
ALLOWED_ORIGINS = {
    "http://127.0.0.1:5173",
    "http://localhost:5173"
}
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s"
)
logger = logging.getLogger("certificate-backend")

PINATA_JWT = os.getenv("PINATA_JWT")
if not PINATA_JWT:
    raise RuntimeError("PINATA_JWT is not set in the environment")

PINATA_UPLOAD_URL = "https://api.pinata.cloud/pinning/pinFileToIPFS"
PINATA_GATEWAY_URL = "https://gateway.pinata.cloud/ipfs"
CID_STORE_PATH = Path(__file__).with_name("ipfs_records.json")


def _load_cid_records():
    if not CID_STORE_PATH.exists():
        return {}
    try:
        with CID_STORE_PATH.open("r", encoding="utf-8") as handle:
            return json.load(handle)
    except json.JSONDecodeError:
        logger.warning("CID store file is corrupted. Starting fresh.")
        return {}


def _save_cid_records(records):
    CID_STORE_PATH.parent.mkdir(parents=True, exist_ok=True)
    with CID_STORE_PATH.open("w", encoding="utf-8") as handle:
        json.dump(records, handle, indent=2)


def pin_file_to_ipfs(filename, file_bytes):
    files = {"file": (filename, file_bytes)}
    headers = {"Authorization": f"Bearer {PINATA_JWT}"}
    try:
        response = requests.post(
            PINATA_UPLOAD_URL,
            files=files,
            headers=headers,
            timeout=60,
        )
        response.raise_for_status()
    except requests.RequestException as exc:
        logger.exception("Pinata upload failed for %s", filename)
        raise RuntimeError(f"Failed to upload file to Pinata: {exc}") from exc

    payload = response.json()
    cid = payload.get("IpfsHash") or payload.get("cid") or payload.get("Hash")
    if not cid:
        logger.error("Pinata response missing CID: %s", payload)
        raise RuntimeError("Pinata response did not include a CID")

    ipfs_url = f"{PINATA_GATEWAY_URL}/{cid}"
    return {
        "cid": cid,
        "ipfs_url": ipfs_url,
    }

# Connect to Ganache
w3 = Web3(Web3.HTTPProvider("http://127.0.0.1:7545"))
assert w3.is_connected(), "Ganache not running"

# Load ABI
with open("certificate_abi.json") as f:
    abi = json.load(f)

# Contract address (from your deployment)
contract_address = "0xd63ee173755De1aAdA54c647454CFC55B996eD6A"

contract = w3.eth.contract(address=contract_address, abi=abi)

# Ganache account private key
private_key = "0x1f51b52e151acb1aa1b741eee1169ddb1aea48d9145d4d72bd1c35da2364027a"     # <-- replace
issuer = w3.eth.account.from_key(private_key)


@app.after_request
def add_cors_headers(response):
    origin = request.headers.get("Origin")
    if origin in ALLOWED_ORIGINS:
        response.headers["Access-Control-Allow-Origin"] = origin
    else:
        response.headers["Access-Control-Allow-Origin"] = next(iter(ALLOWED_ORIGINS))
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    response.headers["Access-Control-Allow-Methods"] = "GET,POST,OPTIONS"
    if request.method == "OPTIONS":
        response.status_code = 204
    return response


@app.route("/issue", methods=["POST"])
def issue_certificate():
    """
    1. Receive uploaded certificate file (PDF/JPEG/etc)
    2. Compute SHA256 hash
    3. Store hash on blockchain using issueCertificate()
    """
    origin = request.headers.get("Origin")
    file = request.files["file"]
    file_bytes = file.read()
    logger.info(
        "Received /issue from %s origin=%s filename=%s size=%s bytes",
        request.remote_addr,
        origin,
        file.filename,
        len(file_bytes)
    )

    cert_hash = hashlib.sha256(file_bytes).hexdigest()
    logger.info("Computed hash %s", cert_hash)

    # Short-circuit if certificate already exists on-chain
    try:
        already_exists, _info = contract.functions.verifyCertificate(cert_hash).call()
    except Exception as exc:
        logger.exception("Failed running pre-verify for hash %s", cert_hash)
        return jsonify({
            "message": "Unable to verify certificate status",
            "details": {
                "type": exc.__class__.__name__,
                "reason": getattr(exc, "args", [str(exc)])[0]
            },
            "hash": cert_hash
        }), 500

    if already_exists:
        logger.info("Certificate %s already present on chain. Skipping issue.", cert_hash)
        return jsonify({
            "message": "Certificate already exists",
            "hash": cert_hash
        }), 409

    try:
        pinata_info = pin_file_to_ipfs(file.filename, file_bytes)
        logger.info("Uploaded file to Pinata with CID %s", pinata_info["cid"])
    except RuntimeError as exc:
        return jsonify({
            "message": "Failed to upload certificate to IPFS",
            "details": str(exc)
        }), 502

    try:
        nonce = w3.eth.get_transaction_count(issuer.address)
        logger.info("Using nonce %s for issuer %s", nonce, issuer.address)

        tx = contract.functions.issueCertificate(
            cert_hash,
            issuer.address
        ).build_transaction({
            "from": issuer.address,
            "nonce": nonce,
            "gas": 4000000,
            "gasPrice": w3.to_wei("20", "gwei")
        })

        signed = issuer.sign_transaction(tx)
        tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
        logger.info("Submitted tx %s", tx_hash.hex())
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
        logger.info("Tx mined in block %s status=%s", receipt.blockNumber, receipt.status)

        records = _load_cid_records()
        records[cert_hash] = {
            "cid": pinata_info["cid"],
            "ipfs_url": pinata_info["ipfs_url"],
            "filename": file.filename,
            "pinnedAt": datetime.utcnow().isoformat() + "Z"
        }
        _save_cid_records(records)

        return jsonify({
            "message": "Certificate issued successfully",
            "hash": cert_hash,
            "txHash": receipt.transactionHash.hex(),
            "cid": pinata_info["cid"],
            "ipfs_url": pinata_info["ipfs_url"]
        })
    except Exception as exc:
        logger.exception("Failed issuing certificate hash %s", cert_hash)
        error_payload = {
            "message": "Failed to issue certificate",
            "details": {
                "type": exc.__class__.__name__,
                "reason": getattr(exc, "args", [str(exc)])[0]
            },
            "hash": cert_hash
        }
        return jsonify(error_payload), 500


@app.route("/verify/<cert_hash>", methods=["GET"])
def verify_certificate(cert_hash):
    logger.info("Received /verify for hash %s", cert_hash)
    valid, info = contract.functions.verifyCertificate(cert_hash).call()
    logger.info("Verification result for %s: valid=%s info=%s", cert_hash, valid, info)

    return jsonify({
        "valid": valid,
        "details": {
            "hash": info[0],
            "issuedTo": info[1],
            "issuedBy": info[2],
            "timestamp": info[3]
        }
    })


@app.route("/certificates", methods=["GET"])
def list_certificates():
    logger.info("Received /certificates request")
    try:
        latest_block = w3.eth.block_number
        logs = contract.events.CertificateIssued.get_logs(
            from_block=0,
            to_block=latest_block
        )
        logger.info("Fetched %s certificate logs up to block %s", len(logs), latest_block)
    except Exception as exc:
        logger.exception("Failed fetching certificate logs")
        return jsonify({
            "message": "Unable to fetch certificates",
            "details": {
                "type": exc.__class__.__name__,
                "reason": getattr(exc, "args", [str(exc)])[0]
            }
        }), 500

    certificates = []
    cid_records = _load_cid_records()
    seen_hashes = set()

    for log in logs:
        cert_hash = log["args"]["certHash"]
        if cert_hash in seen_hashes:
            continue
        seen_hashes.add(cert_hash)

        try:
            valid, info = contract.functions.verifyCertificate(cert_hash).call()
        except Exception as exc:
            logger.exception("Failed verifying hash %s while listing", cert_hash)
            continue

        if not valid:
            continue

        cid_meta = cid_records.get(info[0], {})

        certificates.append({
            "hash": info[0],
            "issuedTo": info[1],
            "issuedBy": info[2],
            "timestamp": info[3],
            "issuedAt": datetime.utcfromtimestamp(info[3]).isoformat() + "Z",
            "cid": cid_meta.get("cid"),
            "ipfs_url": cid_meta.get("ipfs_url"),
            "filename": cid_meta.get("filename"),
            "pinnedAt": cid_meta.get("pinnedAt"),
        })

    certificates.sort(key=lambda item: item["timestamp"], reverse=True)
    logger.info("Returning %s certificates", len(certificates))
    return jsonify(certificates)


@app.route("/upload", methods=["POST"])
def upload_to_ipfs():
    """
    Upload a file to Pinata's IPFS pinning service.
    """
    logger.info("Received /upload request")
    if "file" not in request.files:
        return jsonify({"message": "Missing file in request (multipart key 'file')."}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"message": "Uploaded file must have a filename."}), 400

    file_bytes = file.read()

    try:
        info = pin_file_to_ipfs(file.filename, file_bytes)
    except RuntimeError as exc:
        return jsonify({
            "message": "Failed to upload file to Pinata",
            "details": str(exc)
        }), 502

    logger.info("Uploaded file to Pinata with CID %s via /upload", info["cid"])
    return jsonify(info)


@app.route("/view/<cid>", methods=["GET"])
def view_ipfs_cid(cid):
    """
    Redirect or respond with the gateway URL for a CID.
    """
    ipfs_url = f"{PINATA_GATEWAY_URL}/{cid}"
    wants_json = request.args.get("json") == "1" or request.args.get("redirect", "true").lower() == "false"

    if wants_json:
        return jsonify({
            "cid": cid,
            "ipfs_url": ipfs_url
        })

    return redirect(ipfs_url, code=302)


if __name__ == "__main__":
    app.run(port=5000)
