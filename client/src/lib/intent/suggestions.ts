// Architecture-domain autocomplete suggestions for the planner intent inputs.
// Deterministic, hand-curated. Surfaced to the user via native <datalist>
// elements — no external libraries, fully accessible, keyboard-friendly.

export const constraintSuggestions = [
  '99.9% Availability',
  '99.99% Availability',
  'Multi-region (Active-Active)',
  'Multi-region (Active-Passive)',
  'Single-region with cross-region backups',
  'Data encrypted in transit and at rest',
  'mTLS between internal services',
  'Zero-trust networking',
  'PCI DSS Compliance',
  'HIPAA Compliance',
  'GDPR Compliance',
  'SOC 2 Type II',
  'p95 latency < 200ms',
  'p99 latency < 800ms',
  'Async order processing',
  'Read-replica scaling',
  'Self-healing (automated recovery)',
  'Immutable infrastructure',
  'Blue/green deployments',
  'Strong consistency for transactional data',
];

export const avoidSuggestions = [
  'Vendor Lock-in',
  'Monolith',
  'Single Region',
  'Single Point of Failure',
  'Manual Deployments',
  'Long-lived database transactions',
  'Synchronous service chains',
  'Plaintext traffic',
  'Hard-coded secrets',
  'Polling-based integrations',
  'Direct database access from clients',
  'Stateful services without backups',
  'Public-facing datastores',
  'Untested DR plan',
];

export const preferredStackSuggestions = [
  // Cloud
  'AWS', 'GCP', 'Azure',
  // Compute / orchestration
  'Kubernetes', 'AWS Lambda', 'AWS Fargate', 'EC2', 'Cloud Run',
  // Languages / runtimes
  'Node.js', 'TypeScript', 'Python', 'Go', 'Java', 'Rust',
  // Web frameworks
  'React', 'Next.js', 'Vue', 'Svelte',
  // API styles
  'REST', 'gRPC', 'GraphQL',
  // Datastores
  'PostgreSQL', 'MySQL', 'MongoDB', 'DynamoDB', 'CockroachDB', 'Cassandra',
  // Caches / queues
  'Redis', 'Memcached', 'Kafka', 'RabbitMQ', 'NATS', 'AWS SQS', 'AWS SNS',
  // Search / analytics
  'Elasticsearch', 'OpenSearch', 'ClickHouse', 'Snowflake', 'BigQuery',
  // CDN / edge
  'CloudFront', 'Cloudflare', 'Fastly',
  // IaC / GitOps
  'Terraform', 'Pulumi', 'ArgoCD', 'Flux',
  // Observability
  'Prometheus', 'Grafana', 'OpenTelemetry', 'Datadog', 'ELK Stack', 'Loki',
  // Security
  'OAuth2', 'OIDC', 'Vault', 'AWS KMS',
];

export const complianceSuggestions = [
  'HIPAA',
  'GDPR',
  'PCI DSS',
  'SOC 2',
  'SOC 2 Type II',
  'ISO 27001',
  'FedRAMP Moderate',
  'FedRAMP High',
  'CCPA',
  'NIST 800-53',
  'PSD2',
  'HITRUST',
];

export const scaleUserSuggestions = [
  '< 1K Users',
  '10K Users',
  '100K Users',
  '1M Users',
  '10M+ Users',
  '100M+ Users',
  'Internal-only',
];

export const scaleRpsSuggestions = [
  'Peak: 100 RPS',
  'Peak: 1K RPS',
  'Peak: 5K RPS',
  'Peak: 20K RPS',
  'Peak: 50K RPS',
  'Peak: 200K RPS',
  'Bursty / event-driven',
];

export const budgetSuggestions = [
  '< $5K / month',
  '< $20K / month',
  '< $50K / month',
  '< $120K / month',
  '< $500K / month',
  '$1M+ / year',
  'Cost-as-a-feature (variable)',
];
