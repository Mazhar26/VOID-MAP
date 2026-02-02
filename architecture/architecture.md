## Architecture Overview

VOID-MAP is a privacy-first, serverless system built on AWS.

Components:
- API Gateway (HTTP API)
- Lambda (write path)
- DynamoDB with TTL (ephemeral storage)
- Lambda (read-only aggregation)

Principle:
Forgetting is enforced by infrastructure, not discipline.
