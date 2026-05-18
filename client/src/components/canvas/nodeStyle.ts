import type { ServiceCategory } from '@/types/graph';

export interface NodePalette {
  ring: string;
  bg: string;
  badge: string;
  label: string;
  icon: string;
  legend: string;
}

export const palette: Record<ServiceCategory, NodePalette> = {
  client: {
    ring: 'border-ink-3/50',
    bg: 'bg-bg-2',
    badge: 'text-ink-2',
    label: 'Client',
    icon: 'text-ink-2',
    legend: '#8a90a8',
  },
  cdn: {
    ring: 'border-accent-violet/40',
    bg: 'bg-accent-violet/10',
    badge: 'text-accent-violet',
    label: 'Edge / CDN',
    icon: 'text-accent-violet',
    legend: '#8b6cf6',
  },
  security: {
    ring: 'border-accent-red/40',
    bg: 'bg-accent-red/10',
    badge: 'text-accent-red',
    label: 'Security',
    icon: 'text-accent-red',
    legend: '#f87171',
  },
  gateway: {
    ring: 'border-accent-pink/40',
    bg: 'bg-accent-pink/10',
    badge: 'text-accent-pink',
    label: 'Gateway',
    icon: 'text-accent-pink',
    legend: '#f472b6',
  },
  compute: {
    ring: 'border-accent-blue/40',
    bg: 'bg-accent-blue/10',
    badge: 'text-accent-blue',
    label: 'Compute',
    icon: 'text-accent-blue',
    legend: '#56a8ff',
  },
  data: {
    ring: 'border-accent-green/40',
    bg: 'bg-accent-green/10',
    badge: 'text-accent-green',
    label: 'Data Store',
    icon: 'text-accent-green',
    legend: '#4ade80',
  },
  cache: {
    ring: 'border-accent-red/40',
    bg: 'bg-accent-red/10',
    badge: 'text-accent-red',
    label: 'Cache',
    icon: 'text-accent-red',
    legend: '#f87171',
  },
  queue: {
    ring: 'border-accent-orange/40',
    bg: 'bg-accent-orange/10',
    badge: 'text-accent-orange',
    label: 'Messaging',
    icon: 'text-accent-orange',
    legend: '#fb923c',
  },
  observability: {
    ring: 'border-accent-cyan/40',
    bg: 'bg-accent-cyan/10',
    badge: 'text-accent-cyan',
    label: 'Observability',
    icon: 'text-accent-cyan',
    legend: '#4cc9f0',
  },
  storage: {
    ring: 'border-accent-yellow/40',
    bg: 'bg-accent-yellow/10',
    badge: 'text-accent-yellow',
    label: 'Storage',
    icon: 'text-accent-yellow',
    legend: '#fbbf24',
  },
  external: {
    ring: 'border-ink-3/40',
    bg: 'bg-bg-2',
    badge: 'text-ink-2',
    label: 'External',
    icon: 'text-ink-2',
    legend: '#8a90a8',
  },
};
