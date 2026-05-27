# --- DYNAMODB TABLE ---
resource "aws_dynamodb_table" "signals" {
  name         = var.table_name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "geo"
  range_key    = "ts"

  attribute {
    name = "geo"
    type = "S"
  }

  attribute {
    name = "ts"
    type = "S"
  }

  ttl {
    attribute_name = "expires_at"
    enabled        = true
  }

  tags = {
    Environment = var.environment
    Project     = "VOID-MAP"
  }
}

# --- IAM ROLES & POLICIES ---

# Write Lambda Role
resource "aws_iam_role" "write_lambda_role" {
  name = "${var.write_lambda_name}-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

# Write Lambda DynamoDB & Logging Policy
resource "aws_iam_policy" "write_lambda_policy" {
  name        = "${var.write_lambda_name}-policy"
  description = "Policy for Void Map Write Lambda to put items into DynamoDB and log to CloudWatch"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = [
          "dynamodb:PutItem"
        ]
        Resource = aws_dynamodb_table.signals.arn
      },
      {
        Effect   = "Allow"
        Action   = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "write_lambda_logs" {
  role       = aws_iam_role.write_lambda_role.name
  policy_arn = aws_iam_policy.write_lambda_policy.arn
}

# Read Lambda Role
resource "aws_iam_role" "read_lambda_role" {
  name = "${var.read_lambda_name}-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

# Read Lambda DynamoDB & Logging Policy
resource "aws_iam_policy" "read_lambda_policy" {
  name        = "${var.read_lambda_name}-policy"
  description = "Policy for Void Map Read Lambda to query DynamoDB and log to CloudWatch"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = [
          "dynamodb:Query"
        ]
        Resource = aws_dynamodb_table.signals.arn
      },
      {
        Effect   = "Allow"
        Action   = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "read_lambda_logs" {
  role       = aws_iam_role.read_lambda_role.name
  policy_arn = aws_iam_policy.read_lambda_policy.arn
}

# --- LAMBDA SOURCE ARCHIVES ---

data "archive_file" "write_lambda_zip" {
  type        = "zip"
  source_file = "${path.module}/../lambdas/write_signal/handler.py"
  output_path = "${path.module}/write_signal.zip"
}

data "archive_file" "read_lambda_zip" {
  type        = "zip"
  source_file = "${path.module}/../lambdas/read_aggregation/handler.py"
  output_path = "${path.module}/read_aggregation.zip"
}

# --- LAMBDA FUNCTIONS ---

resource "aws_lambda_function" "write_signal" {
  filename         = data.archive_file.write_lambda_zip.output_path
  source_code_hash = data.archive_file.write_lambda_zip.output_base64sha256
  function_name    = var.write_lambda_name
  role             = aws_iam_role.write_lambda_role.arn
  handler          = "handler.lambda_handler"
  runtime          = "python3.9"
  timeout          = 10

  tags = {
    Environment = var.environment
    Project     = "VOID-MAP"
  }
}

resource "aws_lambda_function" "read_aggregation" {
  filename         = data.archive_file.read_lambda_zip.output_path
  source_code_hash = data.archive_file.read_lambda_zip.output_base64sha256
  function_name    = var.read_lambda_name
  role             = aws_iam_role.read_lambda_role.arn
  handler          = "handler.lambda_handler"
  runtime          = "python3.9"
  timeout          = 10

  tags = {
    Environment = var.environment
    Project     = "VOID-MAP"
  }
}

# --- API GATEWAY (HTTP API) ---

resource "aws_apigatewayv2_api" "http_api" {
  name          = "voidmap-http-api"
  protocol_type = "HTTP"

  tags = {
    Environment = var.environment
    Project     = "VOID-MAP"
  }
}

# Integrations
resource "aws_apigatewayv2_integration" "write_integration" {
  api_id           = aws_apigatewayv2_api.http_api.id
  integration_type = "AWS_PROXY"

  integration_uri    = aws_lambda_function.write_signal.invoke_arn
  integration_method = "POST"
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_integration" "read_integration" {
  api_id           = aws_apigatewayv2_api.http_api.id
  integration_type = "AWS_PROXY"

  integration_uri    = aws_lambda_function.read_aggregation.invoke_arn
  integration_method = "POST"
  payload_format_version = "2.0"
}

# Routes
resource "aws_apigatewayv2_route" "write_route" {
  api_id    = aws_apigatewayv2_api.http_api.id
  route_key = "POST /signal"
  target    = "integrations/${aws_apigatewayv2_integration.write_integration.id}"
}

resource "aws_apigatewayv2_route" "read_route" {
  api_id    = aws_apigatewayv2_api.http_api.id
  route_key = "GET /quiet/{geo}"
  target    = "integrations/${aws_apigatewayv2_integration.read_integration.id}"
}

# Allow preflight OPTIONS requests for CORS if clients send it
resource "aws_apigatewayv2_route" "options_write_route" {
  api_id    = aws_apigatewayv2_api.http_api.id
  route_key = "OPTIONS /signal"
  target    = "integrations/${aws_apigatewayv2_integration.write_integration.id}"
}

resource "aws_apigatewayv2_route" "options_read_route" {
  api_id    = aws_apigatewayv2_api.http_api.id
  route_key = "OPTIONS /quiet/{geo}"
  target    = "integrations/${aws_apigatewayv2_integration.read_integration.id}"
}

# Stage with throttling
resource "aws_apigatewayv2_stage" "default_stage" {
  api_id      = aws_apigatewayv2_api.http_api.id
  name        = "$default"
  auto_deploy = true

  # Default route settings (can be overridden per route if desired)
  default_route_settings {
    throttling_burst_limit = 100
    throttling_rate_limit  = 50
  }

  # Route specific settings to configure throttling
  # recommended: 100 req/s burst, 50 req/s sustained
  route_settings {
    route_key              = aws_apigatewayv2_route.write_route.route_key
    throttling_burst_limit = 100
    throttling_rate_limit  = 50
  }

  route_settings {
    route_key              = aws_apigatewayv2_route.read_route.route_key
    throttling_burst_limit = 100
    throttling_rate_limit  = 50
  }

  tags = {
    Environment = var.environment
    Project     = "VOID-MAP"
  }
}

# --- LAMBDA PERMISSIONS ---

resource "aws_lambda_permission" "apigw_write" {
  statement_id  = "AllowAPIGatewayInvokeWrite"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.write_signal.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "apigw_read" {
  statement_id  = "AllowAPIGatewayInvokeRead"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.read_aggregation.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http_api.execution_arn}/*/*"
}
