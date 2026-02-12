#!/usr/bin/env python3
"""Upload PPTX to Google Drive and convert to Google Slides."""

import subprocess
import json
import requests
import os

DIR = os.path.dirname(os.path.abspath(__file__))
PPTX_PATH = os.path.join(DIR, "wp4-4.pptx")

# Get access token from gcloud
token = subprocess.check_output(
    ["gcloud", "auth", "print-access-token"],
    text=True
).strip()

headers = {"Authorization": f"Bearer {token}"}

# Step 1: Create file metadata with conversion
metadata = {
    "name": "WP4.4 — Designing Quantum Interfaces for Society",
    "mimeType": "application/vnd.google-apps.presentation",  # Convert to Slides
}

# Step 2: Multipart upload with conversion
import io

# Use resumable upload for reliability
# First, initiate the upload
init_url = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&convert=true"

from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase

# Simpler approach: use requests multipart
import mimetypes

with open(PPTX_PATH, "rb") as f:
    pptx_data = f.read()

# Multipart upload
boundary = "----boundary123456"
body = (
    f"--{boundary}\r\n"
    f"Content-Type: application/json; charset=UTF-8\r\n\r\n"
    f"{json.dumps(metadata)}\r\n"
    f"--{boundary}\r\n"
    f"Content-Type: application/vnd.openxmlformats-officedocument.presentationml.presentation\r\n\r\n"
).encode("utf-8") + pptx_data + f"\r\n--{boundary}--".encode("utf-8")

resp = requests.post(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
    headers={
        "Authorization": f"Bearer {token}",
        "Content-Type": f"multipart/related; boundary={boundary}",
    },
    data=body,
)

if resp.status_code == 200:
    result = resp.json()
    file_id = result["id"]
    slides_url = f"https://docs.google.com/presentation/d/{file_id}/edit"
    print(f"Uploaded to Google Slides!")
    print(f"URL: {slides_url}")

    # Make it accessible to anyone with the link
    perm_resp = requests.post(
        f"https://www.googleapis.com/drive/v3/files/{file_id}/permissions",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        json={
            "type": "anyone",
            "role": "writer",
        },
    )
    if perm_resp.status_code == 200:
        print("Shared: anyone with link can edit")
    else:
        print(f"Sharing failed: {perm_resp.status_code} {perm_resp.text}")
else:
    print(f"Upload failed: {resp.status_code}")
    print(resp.text)
