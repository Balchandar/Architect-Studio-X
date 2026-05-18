import type { IntentState } from '@/types/intent';

export const sampleIntent: IntentState = {
  businessGoal:
    'Build a scalable e-commerce platform with global reach and high availability.',
  constraints: [
    'Multi-region (Active-Active)',
    '99.99% Availability',
    'Data encrypted in transit and at rest',
    'PCI DSS Compliance',
  ],
  compliance: ['PCI DSS', 'GDPR'],
  preferredStack: ['Kubernetes', 'AWS', 'PostgreSQL', 'Kafka', 'Redis', 'REST / gRPC'],
  avoid: ['Vendor Lock-in', 'Monolith', 'Single Region'],
  budget: '< $120K / month',
  scaleUsers: '10M+ Users',
  scalePeakRps: 'Peak: 50K RPS',
  teamStrong: 'Node.js, Python, SQL',
  teamMedium: 'DevOps, Kafka',
  deploymentTargets: ['AWS', 'Multi-Region'],
  model: 'auto',
};
