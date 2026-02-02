"""
VOID-MAP — Phase 2 Write Lambda
Purpose:
- Validate silence signals
- Store them ephemerally using DynamoDB TTL
- No audio, no identity, no permanent storage
"""

import json
import time
import boto3

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table("voidmap_ephemeral_signals")

ALLOWED_BUCKETS = {
    "very_quiet",
    "quiet",
    "moderate",
    "loud"
}

TTL_SECONDS = 30 * 60  # 30 minutes

def lambda_handler(event, context):
    try:
        body = json.loads(event.get("body", "{}"))

        ts = body.get("ts")
        geo = body.get("geo")
        noise_bucket = body.get("noise_bucket")

        if isinstance(noise_bucket, str):
            noise_bucket = noise_bucket.strip()

        # Validation
        if not isinstance(ts, int):
            return _bad_request("Invalid or missing 'ts'")

        if not isinstance(geo, str) or len(geo) < 3:
            return _bad_request("Invalid or missing 'geo'")

        if noise_bucket not in ALLOWED_BUCKETS:
            return _bad_request("Invalid 'noise_bucket'")

        expires_at = int(time.time()) + TTL_SECONDS

        table.put_item(
            Item={
                "geo": geo,
                "ts": ts,
                "noise_bucket": noise_bucket,
                "expires_at": expires_at
            }
        )

        # Non-sensitive log
        print({
            "geo": geo,
            "bucket": noise_bucket,
            "expires_at": expires_at
        })

        return {
            "statusCode": 200,
            "body": json.dumps({
                "message": "Silence remembered briefly."
            })
        }

    except Exception:
        return _bad_request("Malformed JSON")

def _bad_request(msg):
    return {
        "statusCode": 400,
        "body": json.dumps({
            "error": msg
        })
    }
