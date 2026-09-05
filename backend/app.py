import uuid
import jwt
from datetime import datetime, timedelta

import os
import psycopg2
from dotenv import load_dotenv

from fastapi import FastAPI, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import bcrypt


# -----------------------------
# Environment / Database
# -----------------------------

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
SECRET_KEY = os.getenv("SECRET_KEY", "securewipe-development-secret-key")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60
security = HTTPBearer()
def verify_token(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    token = credentials.credentials

    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        username = payload.get("sub")

        if not username:
            raise HTTPException(
                status_code=401,
                detail="Invalid token"
            )

        return username

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=401,
            detail="Token has expired"
        )

    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=401,
            detail="Invalid token"
        )

def get_db_connection():
    return psycopg2.connect(DATABASE_URL)


# -----------------------------
# FastAPI
# -----------------------------

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
        "https://secure-wipe-mauve.vercel.app",
        "https://secure-wipe-git-main-rishikant1.vercel.app",
        "https://secure-wipe-9c2d9ghyw-rishikant1.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# -----------------------------
# Database Initialization
# -----------------------------

def initialize_database():
    conn = get_db_connection()
    cur = conn.cursor()

    # -----------------------------
    # Assets table
    # -----------------------------
    cur.execute("""
        CREATE TABLE IF NOT EXISTS assets (
            id SERIAL PRIMARY KEY,
            asset_tag TEXT NOT NULL,
            device_type TEXT NOT NULL,
            serial_number TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'registered',
            created_at TEXT NOT NULL,
            organization TEXT DEFAULT '',
            wipe_policy TEXT
        )
    """)

    # -----------------------------
    # Users table
    # -----------------------------
    cur.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL
        )
    """)

    # -----------------------------
    # Audit Logs table
    # -----------------------------
    cur.execute("""
        CREATE TABLE IF NOT EXISTS audit_logs (
            id TEXT PRIMARY KEY,
            action TEXT NOT NULL,
            asset_id TEXT,
            details TEXT,
            timestamp TEXT NOT NULL,
            username TEXT
        )
    """)

    # -----------------------------
    # Certificates table
    # -----------------------------
    cur.execute("""
        CREATE TABLE IF NOT EXISTS certificates (
            certificate_id TEXT PRIMARY KEY,
            asset_id TEXT NOT NULL,
            status TEXT NOT NULL,
            wipe_policy TEXT,
            verified BOOLEAN DEFAULT TRUE
        )
    """)

    # -----------------------------
    # Safety for existing databases
    # -----------------------------
    cur.execute("""
        ALTER TABLE assets
        ADD COLUMN IF NOT EXISTS organization TEXT DEFAULT ''
    """)

    cur.execute("""
        ALTER TABLE assets
        ADD COLUMN IF NOT EXISTS wipe_policy TEXT
    """)

    cur.execute("""
        ALTER TABLE audit_logs
        ADD COLUMN IF NOT EXISTS username TEXT
    """)

    conn.commit()
    cur.close()
    conn.close()


initialize_database()


# -----------------------------
# Data Models
# -----------------------------

class UserRegister(BaseModel):
    username: str
    password: str


class UserLogin(BaseModel):
    username: str
    password: str


class Asset(BaseModel):
    asset_tag: str
    device_type: str
    serial_number: str
    organization: str


class WipePolicy(BaseModel):
    policy: str


# -----------------------------
# Audit Logs
# -----------------------------

def add_audit_log(action, asset_id, details, username):

    conn = get_db_connection()
    cur = conn.cursor()

    log_id = str(uuid.uuid4())
    timestamp = datetime.now().isoformat()

    cur.execute(
        """
       
        INSERT INTO audit_logs
    (id, action, asset_id, details, timestamp, username)
    VALUES (%s, %s, %s, %s, %s, %s)
    """,
    (log_id, action, asset_id, details, timestamp, username)
)
    conn.commit()
    cur.close()
    conn.close()


@app.get("/audit-logs")
def get_audit_logs(username: str = Depends(verify_token)):

    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT id, action, asset_id, details, timestamp, username
        FROM audit_logs
        ORDER BY timestamp DESC
    """)

    rows = cur.fetchall()

    logs = []

    for row in rows:
        logs.append({
            "id": row[0],
            "action": row[1],
            "asset_id": row[2],
            "details": row[3],
            "timestamp": row[4],
            "username": row[5]
        })

    cur.close()
    conn.close()

    return {
        "count": len(logs),
        "logs": logs
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
# User Registration
# -----------------------------

@app.post("/register")
def register_user(user: UserRegister):
    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute(
        "SELECT id FROM users WHERE username = %s",
        (user.username,)
    )

    if cur.fetchone():
        cur.close()
        conn.close()

        return {
            "message": "Username already exists",
            "registered": False
        }

    user_id = str(uuid.uuid4())

    # Hash password before storing it
    hashed_password = bcrypt.hashpw(
    user.password.encode("utf-8"),
    bcrypt.gensalt()
    ).decode("utf-8")

    cur.execute(
        """
        INSERT INTO users (id, username, password)
        VALUES (%s, %s, %s)
        """,
        (user_id, user.username, hashed_password)
    )

    conn.commit()
    cur.close()
    conn.close()

    return {
        "message": "User registered successfully",
        "registered": True
    }

# -----------------------------
# Login
# -----------------------------

@app.post("/login")
def login_user(user: UserLogin):
    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute(
        """
        SELECT username, password
        FROM users
        WHERE username = %s
        """,
        (user.username,)
    )

    result = cur.fetchone()

    cur.close()
    conn.close()

    if result:
        stored_password = result[1]

        # Verify entered password against hashed password
        if bcrypt.checkpw(
            user.password.encode("utf-8"),
            stored_password.encode("utf-8")
        ):
            # Create JWT token
            expiration = datetime.utcnow() + timedelta(
                minutes=ACCESS_TOKEN_EXPIRE_MINUTES
            )

            token_payload = {
                "sub": user.username,
                "exp": expiration
            }

            access_token = jwt.encode(
                token_payload,
                SECRET_KEY,
                algorithm=ALGORITHM
            )

            return {
                "message": "Login successful",
                "logged_in": True,
                "username": user.username,
                "access_token": access_token,
                "token_type": "bearer"
            }

    return {
        "message": "Invalid username or password",
        "logged_in": False
    }

# -----------------------------
# Register Asset
# -----------------------------

@app.post("/assets")
def register_asset(
    asset: Asset,
    username: str = Depends(verify_token)
):

    conn = get_db_connection()
    cur = conn.cursor()

    asset_id = str(uuid.uuid4())
    created_at = datetime.now().isoformat()

    cur.execute(
        """
        INSERT INTO assets
        (asset_tag, device_type, serial_number, status,
         created_at, organization)
        VALUES (%s, %s, %s, %s, %s, %s)
        RETURNING id
        """,
        (
            asset.asset_tag,
            asset.device_type,
            asset.serial_number,
            "registered",
            created_at,
            asset.organization
        )
    )

    database_id = cur.fetchone()[0]

    conn.commit()
    cur.close()
    conn.close()

    new_asset = {
        "id": str(database_id),
        "asset_tag": asset.asset_tag,
        "device_type": asset.device_type,
        "serial_number": asset.serial_number,
        "organization": asset.organization,
        "status": "registered",
        "registered_at": created_at
    }

    add_audit_log(
        "Asset Registered",
        str(database_id),
        f"Asset {asset.asset_tag} registered successfully",
        username
    )

    return {
        "message": "Asset registered successfully",
        "asset": new_asset
    }
# -----------------------------
# Get All Assets
# -----------------------------

@app.get("/assets")
def get_assets(username: str = Depends(verify_token)):


    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT id, asset_tag, device_type, serial_number,
               status, organization, created_at, wipe_policy
        FROM assets
        ORDER BY id DESC
    """)

    rows = cur.fetchall()

    assets = []

    for row in rows:
        assets.append({
            "id": str(row[0]),
            "asset_tag": row[1],
            "device_type": row[2],
            "serial_number": row[3],
            "status": row[4],
            "organization": row[5],
            "registered_at": row[6],
            "wipe_policy": row[7]
        })

    cur.close()
    conn.close()

    return {
        "count": len(assets),
        "assets": assets
    }


# -----------------------------
# Dashboard
# -----------------------------

@app.get("/dashboard")
def dashboard(username: str = Depends(verify_token)):

    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute("SELECT COUNT(*) FROM assets")
    total_assets = cur.fetchone()[0]

    cur.execute(
        "SELECT COUNT(*) FROM assets WHERE status = 'wiped'"
    )
    wiped_assets = cur.fetchone()[0]

    cur.execute("SELECT COUNT(*) FROM certificates")
    total_certificates = cur.fetchone()[0]

    cur.close()
    conn.close()

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


# -----------------------------
# Wipe Policy Selection
# -----------------------------

@app.post("/assets/{asset_id}/wipe-policy")
def select_wipe_policy(
    asset_id: str,
    policy: WipePolicy,
    username: str = Depends(verify_token)
):
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

    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute(
        """
        UPDATE assets
        SET wipe_policy = %s
        WHERE id::text = %s
        RETURNING id
        """,
        (policy.policy, asset_id)
    )

    result = cur.fetchone()

    if not result:
        cur.close()
        conn.close()

        return {
            "message": "Asset not found"
        }

    conn.commit()
    cur.close()
    conn.close()

    add_audit_log(
        "Wipe Policy Selected",
        asset_id,
        f"Wipe policy selected: {policy.policy}",
        username
    )

    return {
        "message": "Wipe policy selected successfully",
        "asset_id": asset_id,
        "wipe_policy": policy.policy
    }


# -----------------------------
# Start Data Wiping
# -----------------------------

@app.post("/assets/{asset_id}/wipe")
def start_wipe(
    asset_id: str,
    username: str = Depends(verify_token)
):

    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute(
        """
        UPDATE assets
        SET status = 'wiped'
        WHERE id::text = %s
        RETURNING id, wipe_policy
        """,
        (asset_id,)
    )

    result = cur.fetchone()

    if not result:
        cur.close()
        conn.close()

        return {
            "message": "Asset not found"
        }

    wipe_policy = result[1] or "not selected"

    conn.commit()
    cur.close()
    conn.close()

    add_audit_log(
        "Data Wiping Completed",
        asset_id,
        f"Data wiping completed using {wipe_policy} policy",
        username  
    )

    return {
        "message": "Data wiping started successfully",
        "asset_id": asset_id,
        "wipe_policy": wipe_policy,
        "status": "wiped"
    }


# -----------------------------
# Verify Wipe
# -----------------------------

@app.get("/assets/{asset_id}/verify")
def verify_wipe(
    asset_id: str,
    username: str = Depends(verify_token)
):

    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute(
        """
        SELECT status
        FROM assets
        WHERE id::text = %s
        """,
        (asset_id,)
    )

    result = cur.fetchone()

    cur.close()
    conn.close()

    if not result:
        return {
            "message": "Asset not found"
        }

    status = result[0]

    if status == "wiping":
        return {
            "asset_id": asset_id,
            "status": "wipe_in_progress",
            "verified": False
        }

    add_audit_log(
        "Wipe Verified",
        asset_id,
        f"Wipe verification successful with status: {status}"
    )

    return {
        "asset_id": asset_id,
        "status": status,
        "verified": True
    }


# -----------------------------
# Generate Certificate
# -----------------------------

@app.post("/assets/{asset_id}/certificate")
def generate_certificate(
    asset_id: str,
    username: str = Depends(verify_token)
):

    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute(
        """
        SELECT status, wipe_policy
        FROM assets
        WHERE id::text = %s
        """,
        (asset_id,)
    )

    result = cur.fetchone()

    if not result:
        cur.close()
        conn.close()

        return {
            "message": "Asset not found",
            "certificate_generated": False
        }

    status = result[0]
    wipe_policy = result[1] or "quick"

    if status != "wiped":
        cur.close()
        conn.close()

        return {
            "message": "Asset must be wiped before certificate generation",
            "certificate_generated": False
        }

    certificate_id = str(uuid.uuid4())

    cur.execute(
        """
        INSERT INTO certificates
        (certificate_id, asset_id, status, wipe_policy, verified)
        VALUES (%s, %s, %s, %s, %s)
        """,
        (
            certificate_id,
            asset_id,
            "wiped",
            wipe_policy,
            True
        )
    )

    conn.commit()
    cur.close()
    conn.close()

    certificate = {
        "certificate_id": certificate_id,
        "asset_id": asset_id,
        "status": "wiped",
        "wipe_policy": wipe_policy,
        "verified": True
    }

    add_audit_log(
        "Certificate Generated",
        asset_id,
        f"Certificate generated successfully: {certificate_id}",
        username
    )

    return certificate


# -----------------------------
# Generate QR Code
# -----------------------------

@app.get("/certificates/{certificate_id}/qr")
def generate_qr_code(certificate_id: str):

    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute(
        """
        SELECT certificate_id
        FROM certificates
        WHERE certificate_id = %s
        """,
        (certificate_id,)
    )

    result = cur.fetchone()

    cur.close()
    conn.close()

    if not result:
        return {
            "message": "Certificate not found",
            "qr_generated": False
        }

    return {
        "certificate_id": certificate_id,
        "qr_generated": True,
        "qr_data": f"SecureWipe-Certificate:{certificate_id}"
    }
# -----------------------------
# Download Certificate PDF
# -----------------------------

from fastapi.responses import StreamingResponse
from reportlab.pdfgen import canvas
from io import BytesIO


@app.get("/certificates/{certificate_id}/download")
def download_certificate(
    certificate_id: str,
    username: str = Depends(verify_token)
):

    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute(
        """
        SELECT certificate_id, asset_id, status, wipe_policy, verified
        FROM certificates
        WHERE certificate_id = %s
        """,
        (certificate_id,)
    )

    result = cur.fetchone()

    cur.close()
    conn.close()

    if not result:
        raise HTTPException(
            status_code=404,
            detail="Certificate not found"
        )

    certificate_id = result[0]
    asset_id = result[1]
    status = result[2]
    wipe_policy = result[3]
    verified = result[4]

    # Create PDF in memory
    buffer = BytesIO()

    pdf = canvas.Canvas(buffer)

    pdf.setTitle("SecureWipe Certificate")

    pdf.setFont("Helvetica-Bold", 22)
    pdf.drawCentredString(
        300,
        760,
        "SECUREWIPE"
    )

    pdf.setFont("Helvetica-Bold", 16)
    pdf.drawCentredString(
        300,
        720,
        "DATA WIPING CERTIFICATE"
    )

    pdf.setFont("Helvetica", 11)

    pdf.drawString(
        80,
        660,
        f"Certificate ID: {certificate_id}"
    )

    pdf.drawString(
        80,
        630,
        f"Asset ID: {asset_id}"
    )

    pdf.drawString(
        80,
        600,
        f"Status: {status}"
    )

    pdf.drawString(
        80,
        570,
        f"Wipe Policy: {wipe_policy}"
    )

    pdf.drawString(
        80,
        540,
        f"Verification: {'Verified' if verified else 'Not Verified'}"
    )

    pdf.setFont("Helvetica-Bold", 12)
    pdf.drawString(
        80,
        470,
        "Certificate Status: VERIFIED"
    )

    pdf.setFont("Helvetica", 10)
    pdf.drawString(
        80,
        420,
        "This certificate confirms that the asset data wiping"
    )

    pdf.drawString(
        80,
        400,
        "process was completed through the SecureWipe platform."
    )

    pdf.drawString(
        80,
        340,
        "Issued by SecureWipe Platform"
    )

    pdf.drawString(
        80,
        320,
        "Digital verification enabled"
    )

    pdf.save()

    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition":
                f"attachment; filename=SecureWipe-{certificate_id}.pdf"
        }
    )

# -----------------------------
# Verify Certificate
# -----------------------------

@app.get("/certificates/{certificate_id}/verify")
def verify_certificate(certificate_id: str):

    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute(
        """
        SELECT certificate_id, asset_id, status
        FROM certificates
        WHERE certificate_id = %s
        """,
        (certificate_id,)
    )

    result = cur.fetchone()

    cur.close()
    conn.close()

    if not result:
        return {
            "certificate_id": certificate_id,
            "verified": False,
            "message": "Certificate not found"
        }

    return {
        "certificate_id": result[0],
        "asset_id": result[1],
        "status": result[2],
        "verified": True,
        "message": "Certificate verified successfully"
    }