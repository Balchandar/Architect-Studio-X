import {
  Box,
  Cloud,
  Database,
  Globe,
  Layers,
  Mail,
  MessageSquare,
  Monitor,
  Network,
  Radio,
  Server,
  Shield,
  ShieldCheck,
  Wifi,
  Zap,
  Building2,
  HardDrive,
  Smartphone,
  Activity,
  Workflow,
  CreditCard,
  type LucideIcon,
} from 'lucide-react';
import type { ServiceCategory, ServiceNode } from '@/types/graph';

type IconType = LucideIcon;

export function getServiceIcon(s: ServiceNode): IconType {
  // name-based first
  if (/cloudfront|cdn|edge/i.test(s.name)) return Cloud;
  if (/waf|firewall/i.test(s.name)) return Shield;
  if (/api gateway|gateway/i.test(s.name)) return ShieldCheck;
  if (/postgres|mysql|sql|database/i.test(s.name)) return Database;
  if (/redis|cache/i.test(s.name)) return Zap;
  if (/kafka|queue|bus/i.test(s.name)) return Workflow;
  if (/payment/i.test(s.name)) return CreditCard;
  if (/email|mail/i.test(s.name)) return Mail;
  if (/sms|message/i.test(s.name)) return MessageSquare;
  if (/grafana/i.test(s.name)) return Activity;
  if (/prometheus/i.test(s.name)) return Activity;
  if (/elk|log/i.test(s.name)) return Layers;
  if (/s3|storage|bucket/i.test(s.name)) return HardDrive;
  if (/users/i.test(s.name) && s.type === 'client') return Smartphone;
  if (/replica|backup|dr/i.test(s.name)) return HardDrive;

  // type fallback
  const byType: Record<ServiceCategory, IconType> = {
    client: Monitor,
    cdn: Cloud,
    security: Shield,
    gateway: ShieldCheck,
    compute: Server,
    data: Database,
    cache: Zap,
    queue: Workflow,
    observability: Activity,
    storage: HardDrive,
    external: Globe,
  };
  return byType[s.type] ?? Box;
}

export const RegionIcon = Globe;
export const NetworkIcon = Network;
export const RadioIcon = Radio;
export const WifiIcon = Wifi;
export const BuildingIcon = Building2;
