"""
VOID-MAP — Stats Lambda
Purpose:
- Return real-time metrics: active geohash zones, signal count, table size
- Compute TTL cost savings estimate
- Uses DescribeTable (free) + lightweight Scan (projected, cached)
- No audio, no identity, no permanent storage
"""

import json
import logging
import time
import boto3

logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb_resource = boto3.resource("dynamodb")
dynamodb_client = boto3.client("dynamodb")
table = dynamodb_resource.Table("voidmap_ephemeral_signals")

TABLE_NAME = "voidmap_ephemeral_signals"
TTL_SECONDS = 30 * 60  # 30 minutes
DYNAMODB_STORAGE_COST_PER_GB_MONTH = 0.25  # USD

# Simple in-memory cache (persists across warm Lambda invocations)
_cache = {
    "data": None,
    "timestamp": 0
}
CACHE_TTL_SECONDS = 300  # Cache stats for 5 minutes

CORS_HEADERS = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, OPTIONS"
}


def lambda_handler(event, context):
    # Handle CORS preflight
    http_method = event.get("httpMethod") or event.get("requestContext", {}).get("http", {}).get("method", "")
    if http_method == "OPTIONS":
        return _response(200, {"message": "OK"})

    now = time.time()

    # Return cached data if still fresh
    if _cache["data"] and (now - _cache["timestamp"]) < CACHE_TTL_SECONDS:
        logger.info("Returning cached stats")
        return _response(200, _cache["data"])

    try:
        # 1. DescribeTable — FREE, no RCU cost
        desc = dynamodb_client.describe_table(TableName=TABLE_NAME)
        table_info = desc["Table"]
        item_count = table_info.get("ItemCount", 0)
        table_size_bytes = table_info.get("TableSizeBytes", 0)

        # 2. Single scan — collect unique geos and count simultaneously
        #    With 30-min TTL, the table is always tiny
        unique_geos = set()
        total_signals = 0
        scan_params = {"ProjectionExpression": "geo"}

        while True:
            response = table.scan(**scan_params)
            for item in response.get("Items", []):
                unique_geos.add(item.get("geo"))
                total_signals += 1
            last_key = response.get("LastEvaluatedKey")
            if not last_key:
                break
            scan_params["ExclusiveStartKey"] = last_key

        active_zones = len(unique_geos)

        # 3. Calculate TTL cost savings
        signals_per_30min = total_signals
        signals_per_hour = signals_per_30min * 2
        signals_per_month = signals_per_hour * 24 * 30

        bytes_per_signal = 150
        monthly_storage_without_ttl_bytes = signals_per_month * bytes_per_signal
        monthly_storage_without_ttl_gb = monthly_storage_without_ttl_bytes / (1024 ** 3)

        current_storage_gb = table_size_bytes / (1024 ** 3)

        monthly_cost_without_ttl = monthly_storage_without_ttl_gb * DYNAMODB_STORAGE_COST_PER_GB_MONTH
        monthly_cost_with_ttl = current_storage_gb * DYNAMODB_STORAGE_COST_PER_GB_MONTH
        ttl_cost_saved_monthly = round(monthly_cost_without_ttl - monthly_cost_with_ttl, 4)

        stats = {
            "active_geohash_zones": active_zones,
            "active_geohash_list": sorted(list(unique_geos)),
            "total_active_signals": total_signals,
            "table_size_bytes": table_size_bytes,
            "ttl_window_minutes": 30,
            "ttl_cost_savings": {
                "monthly_storage_without_ttl_gb": round(monthly_storage_without_ttl_gb, 6),
                "current_storage_gb": round(current_storage_gb, 6),
                "estimated_monthly_savings_usd": ttl_cost_saved_monthly
            }
        }

        _cache["data"] = stats
        _cache["timestamp"] = now

        logger.info({
            "action": "stats_computed",
            "active_zones": active_zones,
            "total_signals": total_signals
        })

        return _response(200, stats)

    except Exception as e:
        logger.error(f"Stats computation failed: {e}", exc_info=True)
        return _response(500, {"error": "Failed to compute stats"})


def _response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": CORS_HEADERS,
        "body": json.dumps(body)
    }
