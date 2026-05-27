output "api_endpoint" {
  value       = aws_apigatewayv2_api.http_api.api_endpoint
  description = "The URL of the HTTP API Gateway"
}

output "dynamodb_table_arn" {
  value       = aws_dynamodb_table.signals.arn
  description = "The ARN of the DynamoDB table"
}

output "write_lambda_arn" {
  value       = aws_lambda_function.write_signal.arn
  description = "The ARN of the Write Lambda"
}

output "read_lambda_arn" {
  value       = aws_lambda_function.read_aggregation.arn
  description = "The ARN of the Read Lambda"
}
