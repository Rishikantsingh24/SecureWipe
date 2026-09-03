# SecureWipe

## Secure Data Wiping & Asset Recycling Platform

SecureWipe is a web-based platform designed to manage IT assets, securely wipe data, verify the wiping process, and generate digital certificates with QR-based verification.

## Problem Statement

When organizations dispose of or recycle old IT devices, sensitive data may remain on those devices. Simply deleting files is not always enough.

SecureWipe provides a structured workflow to manage assets and record the complete data-wiping process.

## Solution

SecureWipe provides a simple platform where users can:

- Register IT assets
- Select a data wiping policy
- Start the wiping process
- Verify the wipe status
- Generate a digital certificate
- Generate QR verification data
- Maintain audit logs

## Key Features

### 1. Asset Registration

Users can register an IT asset using:

- Asset Tag
- Device Type
- Serial Number
- Organization

### 2. Wipe Policy Selection

The platform supports three wipe policies:

- Quick
- Standard
- Secure

### 3. Data Wiping

Users can start the wiping process for a registered asset.

### 4. Wipe Verification

The system verifies whether the asset has successfully completed the wiping process.

### 5. Digital Certificate

After successful wiping, SecureWipe generates a digital certificate containing:

- Certificate ID
- Asset ID
- Wipe Status
- Wipe Policy
- Verification Status

### 6. QR Verification

A QR code is generated for the digital certificate so that the certificate information can be verified easily.

### 7. Audit Logs

SecureWipe maintains audit logs for important activities such as:

- Asset Registration
- Wipe Policy Selection
- Data Wiping
- Wipe Verification
- Certificate Generation

## Workflow

```text
Register Asset
      ↓
Select Wipe Policy
      ↓
Start Wiping
      ↓
Verify Wipe
      ↓
Generate Certificate
      ↓
Generate QR Code
      ↓
Audit Logs