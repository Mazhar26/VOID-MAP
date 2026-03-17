# Phase 1 — Infrastructure Setup

> **Goal:** Provision all AWS resources needed for the VOID-MAP backend.

## Deliverables

- [x] DynamoDB table `voidmap_ephemeral_signals` created
  - Partition key: `geo` (String)
  - Sort key: `ts` (Number)
  - TTL attribute: `expires_at`
- [x] API Gateway HTTP API created with routes:
  - `POST /signal` → Write Lambda
  - `GET /quiet/{geo}` → Read Lambda
- [x] IAM roles and policies for Lambda → DynamoDB access
- [ ] API Gateway throttling configured for rate limiting

## Notes

- CORS is handled at the Lambda level (response headers) rather than API Gateway level
- DynamoDB is provisioned in on-demand capacity mode for cost efficiency at low traffic
- No VPC required — Lambdas access DynamoDB via public endpoint

## Status: 🔄 In Progress (throttling pending)
