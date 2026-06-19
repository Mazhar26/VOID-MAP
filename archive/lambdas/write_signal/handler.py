"""
VOID-MAP — Phase 2 Write Lambda
Purpose:
- Validate silence signals
- Store them ephemerally using DynamoDB TTL
- No audio, no identity, no permanent storage
"""

import json
import logging
import time
import uuid
import boto3

logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table("voidmap_ephemeral_signals")

ALLOWED_BUCKETS = {
    "very_quiet",
    "quiet",
    "moderate",
    "loud"
}

TTL_SECONDS = 30 * 60  # 30 minutes
TS_TOLERANCE_SECONDS = 5 * 60  # Allow timestamps within ±5 minutes of server time

CORS_HEADERS = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
}

def lambda_handler(event, context):
    # Handle CORS preflight
    http_method = event.get("httpMethod") or event.get("requestContext", {}).get("http", {}).get("method", "")
    if http_method == "OPTIONS":
        return _response(200, {"message": "OK"})

    try:
        body = json.loads(event.get("body", "{}"))
    except (json.JSONDecodeError, TypeError):
        return _bad_request("Malformed JSON")

    try:
        ts = body.get("ts")
        geo = body.get("geo")
        noise_bucket = body.get("noise_bucket")

        if isinstance(noise_bucket, str):
            noise_bucket = noise_bucket.strip()

        # Validation
        if not isinstance(ts, int):
            return _bad_request("Invalid or missing 'ts'")

        # Validate timestamp is within a reasonable window of server time
        now = int(time.time())
        if abs(ts - now) > TS_TOLERANCE_SECONDS:
            return _bad_request("Timestamp is too far from server time")

        if not isinstance(geo, str) or len(geo) < 3:
            return _bad_request("Invalid or missing 'geo'")

        if noise_bucket not in ALLOWED_BUCKETS:
            return _bad_request("Invalid 'noise_bucket'")

        expires_at = now + TTL_SECONDS
        signal_id = uuid.uuid4().hex[:8]
        sort_key = f"{ts}#{signal_id}"

        table.put_item(
            Item={
                "geo": geo,
                "ts": sort_key,
                "noise_bucket": noise_bucket,
                "expires_at": expires_at
            }
        )

        logger.info({
            "action": "signal_stored",
            "geo": geo,
            "bucket": noise_bucket,
            "expires_at": expires_at
        })

        return _response(200, {"message": "Silence remembered briefly."})

    except Exception as e:
        logger.error(f"Unexpected error: {e}", exc_info=True)
        return _response(500, {"error": "Internal server error"})

def _response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": CORS_HEADERS,
        "body": json.dumps(body)
    }

def _bad_request(msg):
    return _response(400, {"error": msg})
