"""
VOID-MAP — Phase 3 Read Aggregation Lambda
Purpose:
- Aggregate recent silence signals
- Return a navigable quiet score
- Read-only, no raw data exposure
"""

import json
import time
import boto3
from boto3.dynamodb.conditions import Key

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table("voidmap_ephemeral_signals")

WINDOW_SECONDS = 30 * 60  # 30 minutes

WEIGHTS = {
    "very_quiet": 1.0,
    "quiet": 0.75,
    "moderate": 0.4,
    "loud": 0.1
}

def lambda_handler(event, context):
    geo = event.get("pathParameters", {}).get("geo")

    if not geo or len(geo) < 3:
        return _bad_request("Invalid geo")

    now = int(time.time())
    window_start = now - WINDOW_SECONDS

    response = table.query(
        KeyConditionExpression=
            Key("geo").eq(geo) &
            Key("ts").gte(window_start)
    )

    items = response.get("Items", [])

    if not items:
        return _ok({
            "geo": geo,
            "quiet_score": 0.0,
            "confidence": "low",
            "window_minutes": 30
        })

    score_sum = 0.0
    for item in items:
        bucket = item.get("noise_bucket")
        score_sum += WEIGHTS.get(bucket, 0)

    quiet_score = round(score_sum / len(items), 2)

    confidence = (
        "high" if len(items) > 20 else
        "medium" if len(items) > 5 else
        "low"
    )

    return _ok({
        "geo": geo,
        "quiet_score": quiet_score,
        "confidence": confidence,
        "window_minutes": 30
    })

def _ok(body):
    return {
        "statusCode": 200,
        "body": json.dumps(body)
    }

def _bad_request(msg):
    return {
        "statusCode": 400,
        "body": json.dumps({
            "error": msg
        })
    }
