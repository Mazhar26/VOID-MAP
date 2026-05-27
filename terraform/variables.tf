variable "aws_region" {
  type        = string
  description = "AWS region to deploy the resources"
  default     = "us-east-1"
}

variable "environment" {
  type        = string
  description = "Environment name for tagging and naming"
  default     = "dev"
}

variable "table_name" {
  type        = string
  description = "DynamoDB table name"
  default     = "voidmap_ephemeral_signals"
}

variable "write_lambda_name" {
  type        = string
  description = "Name of the write signal lambda function"
  default     = "voidmap-write-signal"
}

variable "read_lambda_name" {
  type        = string
  description = "Name of the read aggregation lambda function"
  default     = "voidmap-read-aggregation"
}
