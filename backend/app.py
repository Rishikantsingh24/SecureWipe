import uuid
from datetime import datetime

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
app = FastAPI(title="SecureWipe API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5176",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5176",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# -----------------------------
# Data Model
# -----------------------------
class User(BaseModel):
    username: str
    password: str
class Asset(BaseModel):
    asset_tag: str
    device_type: str
    serial_number: str
    organization: str


# Temporary storage
assets = []
users = []
class UserRegister(BaseModel):
    username: str
    password: str


@app.post("/register")
def register_user(user: UserRegister):

    for existing_user in users:
        if existing_user["username"] == user.username:
            return {
                "message": "Username already exists",
                "registered": False
            }

    new_user = {
        "id": str(uuid.uuid4()),
        "username": user.username,
        "password": user.password
    }

    users.append(new_user)

    return {
        "message": "User registered successfully",
        "registered": True
    }
class UserLogin(BaseModel):
    username: str
    password: str

class UserLogin(BaseModel):
    username: str
    password: str


@app.post("/login")
def login_user(user: UserLogin):

    for existing_user in users:
        if (
            existing_user["username"] == user.username
            and existing_user["password"] == user.password
        ):
            return {
                "message": "Login successful",
                "logged_in": True,
                "username": user.username
            }

    return {
        "message": "Invalid username or password",
        "logged_in": False
    }
# ------------------------------
# Audit Logs
# ------------------------------

# ------------------------------
# Audit Logs
# ------------------------------

audit_logs = []

def add_audit_log(action, asset_id, details=""):
    log = {
        "id": str(uuid.uuid4()),
        "action": action,
        "asset_id": asset_id,
        "details": details,
        "timestamp": datetime.now().isoformat()
    }

    audit_logs.append(log)


@app.get("/audit-logs")
def get_audit_logs():
    return {
        "count": len(audit_logs),
        "logs": audit_logs
    }
# -----------------------------
# Home API
# -----------------------------
@app.get("/")
def home():
    return {
        "message": "SecureWipe API is running",
        "status": "success"
    }


# -----------------------------
# Register Asset
# -----------------------------
@app.post("/assets")
def register_asset(asset: Asset):

    new_asset = {
        "id": str(uuid.uuid4()),
        "asset_tag": asset.asset_tag,
        "device_type": asset.device_type,
        "serial_number": asset.serial_number,
        "organization": asset.organization,
        "status": "registered",
        "registered_at": datetime.now().isoformat()
    }

    assets.append(new_asset)
    add_audit_log(
    "Asset Registered",
    new_asset["id"],
    f"Asset {new_asset['asset_tag']} registered successfully"
    )
    return {
        "message": "Asset registered successfully",
        "asset": new_asset
    }


# -----------------------------
# Get All Assets
# -----------------------------
@app.get("/assets")
def get_assets():
    return {
        "count": len(assets),
        "assets": assets
    }
# ------------------------------
# Dashboard
# ------------------------------

@app.get("/dashboard")
def dashboard():

    total_assets = len(assets)

    wiped_assets = sum(
        1 for asset in assets
        if asset.get("status") == "wiped"
    )

    total_certificates = len(certificates)

    verification_rate = (
        (wiped_assets / total_assets) * 100
        if total_assets > 0
        else 0
    )

    return {
        "total_assets": total_assets,
        "wiped": wiped_assets,
        "certificates": total_certificates,
        "verification_rate": verification_rate
    }
# ------------------------------
# Wipe Policy Selection
# ------------------------------

class WipePolicy(BaseModel):
    policy: str


@app.post("/assets/{asset_id}/wipe-policy")
def select_wipe_policy(asset_id: str, policy: WipePolicy):

    allowed_policies = [
        "quick",
        "standard",
        "secure"
    ]

    if policy.policy not in allowed_policies:
        return {
            "message": "Invalid wipe policy",
            "allowed_policies": allowed_policies
        }

    for asset in assets:
        if asset["id"] == asset_id:
            asset["wipe_policy"] = policy.policy
            add_audit_log(
                "Wipe Policy Selected",
                asset_id,
                f"Wipe policy selected: {policy.policy}"
            )
            return {
                "message": "Wipe policy selected successfully",
                "asset_id": asset_id,
                "wipe_policy": policy.policy
            }

    return {
        "message": "Asset not found"
    }
# ------------------------------
# Start Data Wiping
# ------------------------------

@app.post("/assets/{asset_id}/wipe")
def start_wipe(asset_id: str):

    for asset in assets:
        if asset["id"] == asset_id:

            # Simulate wiping process
            asset["status"] = "wiped"
            add_audit_log(
                "Data Wiping Completed",
                asset_id,
                f"Data wiping completed using {asset.get('wipe_policy', 'not selected')} policy"
            )

            return {
                "message": "Data wiping started successfully",
                "asset_id": asset_id,
                "wipe_policy": asset.get("wipe_policy", "not selected"),
                "status": "wiped"
            }

    return {
        "message": "Asset not found"
    }
# ------------------------------
# Verify Wipe
# ------------------------------

@app.get("/assets/{asset_id}/verify")
def verify_wipe(asset_id: str):

    for asset in assets:
        if asset["id"] == asset_id:

            if asset["status"] == "wiping":
                return {
                    "asset_id": asset_id,
                    "status": "wipe_in_progress",
                    "verified": False
                }
            add_audit_log(
                "Wipe Verified",
                asset_id,
                f"Wipe verification successful with status: {asset['status']}"
)
            return {
                "asset_id": asset_id,
                "status": asset["status"],
                "verified": True
            }

    return {
        "message": "Asset not found"
    }
# ------------------------------
# Generate Certificate
# ------------------------------

certificates = {}

@app.post("/assets/{asset_id}/certificate")
def generate_certificate(asset_id: str):

    for asset in assets:
        if asset["id"] == asset_id:

            if asset["status"] != "wiped":
                return {
                    "message": "Asset must be wiped before certificate generation",
                    "certificate_generated": False
                }

            certificate_id = str(uuid.uuid4())

            certificate = {
                "certificate_id": certificate_id,
                "asset_id": asset_id,
                "status": "wiped",
                "wipe_policy": asset.get("wipe_policy", "quick"),
                "verified": True
            }

            certificates[certificate_id] = certificate
            add_audit_log(
                "Certificate Generated",
                asset_id,
                f"Certificate generated successfully: {certificate['certificate_id']}"
            )
            return certificate

    return {
        "message": "Asset not found",
        "certificate_generated": False
    }


# ------------------------------
# Generate QR Code
# ------------------------------

@app.get("/certificates/{certificate_id}/qr")
def generate_qr_code(certificate_id: str):

    if certificate_id not in certificates:
        return {
            "message": "Certificate not found",
            "qr_generated": False
        }

    certificate = certificates[certificate_id]

    return {
        "certificate_id": certificate_id,
        "qr_generated": True,
        "qr_data": f"SecureWipe-Certificate:{certificate_id}"
    }


# ------------------------------
# Verify Certificate
# ------------------------------

@app.get("/certificates/{certificate_id}/verify")
def verify_certificate(certificate_id: str):

    if certificate_id not in certificates:
        return {
            "certificate_id": certificate_id,
            "verified": False,
            "message": "Certificate not found"
        }

    certificate = certificates[certificate_id]

    return {
        "certificate_id": certificate_id,
        "asset_id": certificate["asset_id"],
        "status": certificate["status"],
        "verified": True,
        "message": "Certificate verified successfully"
    }
 