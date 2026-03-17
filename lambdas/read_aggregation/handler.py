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

# Confidence thresholds based on signal count
CONFIDENCE_THRESHOLD_LOW = 5
CONFIDENCE_THRESHOLD_HIGH = 20

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, OPTIONS"
}

def lambda_handler(event, context):
    # Handle CORS preflight
    http_method = event.get("httpMethod") or event.get("requestContext", {}).get("http", {}).get("method", "")
    if http_method == "OPTIONS":
        return _response(200, {"message": "OK"})

    geo = event.get("pathParameters", {}).get("geo")

    if not geo or len(geo) < 3:
        return _bad_request("Invalid geo")

    now = int(time.time())
    window_start = now - WINDOW_SECONDS

    # Query with pagination to fetch all matching items
    items = []
    query_params = {
        "KeyConditionExpression":
            Key("geo").eq(geo) &
            Key("ts").gte(window_start)
    }

    while True:
        response = table.query(**query_params)
        items.extend(response.get("Items", []))

        last_key = response.get("LastEvaluatedKey")
        if not last_key:
            break
        query_params["ExclusiveStartKey"] = last_key

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
        "high" if len(items) > CONFIDENCE_THRESHOLD_HIGH else
        "medium" if len(items) > CONFIDENCE_THRESHOLD_LOW else
        "low"
    )

    return _ok({
        "geo": geo,
        "quiet_score": quiet_score,
        "confidence": confidence,
        "window_minutes": 30
    })

def _response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": CORS_HEADERS,
        "body": json.dumps(body)
    }

def _ok(body):
    return _response(200, body)

def _bad_request(msg):
    return _response(400, {"error": msg})
