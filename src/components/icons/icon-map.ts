/**
 * Per-icon Lucide map for JSON-driven `icon` string keys.
 * Import only the icons we need so the bundle stays tree-shakeable.
 */
import type { AstroComponent } from '@lucide/astro';
import Hammer from '@lucide/astro/icons/hammer';
import Layers from '@lucide/astro/icons/layers';
import House from '@lucide/astro/icons/house';
import Mountain from '@lucide/astro/icons/mountain';
import Phone from '@lucide/astro/icons/phone';
import Mail from '@lucide/astro/icons/mail';
import MapPin from '@lucide/astro/icons/map-pin';
import Star from '@lucide/astro/icons/star';
import Check from '@lucide/astro/icons/check';
import ChevronRight from '@lucide/astro/icons/chevron-right';
import Menu from '@lucide/astro/icons/menu';
import X from '@lucide/astro/icons/x';
import ArrowRight from '@lucide/astro/icons/arrow-right';
import Clock from '@lucide/astro/icons/clock';
import Building2 from '@lucide/astro/icons/building-2';
import Wrench from '@lucide/astro/icons/wrench';
import Shovel from '@lucide/astro/icons/shovel';
import Fence from '@lucide/astro/icons/fence';

export const iconMap = {
  hammer: Hammer,
  layers: Layers,
  home: House,
  house: House,
  mountain: Mountain,
  phone: Phone,
  mail: Mail,
  'map-pin': MapPin,
  star: Star,
  check: Check,
  'chevron-right': ChevronRight,
  menu: Menu,
  x: X,
  'arrow-right': ArrowRight,
  clock: Clock,
  building: Building2,
  wrench: Wrench,
  shovel: Shovel,
  fence: Fence,
} as const satisfies Record<string, AstroComponent>;

export type IconName = keyof typeof iconMap;

export function getIcon(name: string): AstroComponent | undefined {
  return iconMap[name as IconName];
}

export function resolveIcon(name: string, fallback: IconName = 'hammer'): AstroComponent {
  return iconMap[name as IconName] ?? iconMap[fallback];
}
