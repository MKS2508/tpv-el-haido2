/**
 * AuditLog Section — Registro de Auditoría AEAT VERI*FACTU
 *
 * Terminal-style audit log viewer. Dense data, monospace timestamps,
 * color-coded operation categories, expandable detail panels.
 */

import {
  Activity,
  ChevronDown,
  ChevronRight,
  Download,
  Filter,
  RefreshCw,
  Search,
  Shield,
  ShieldCheck,
  X,
} from 'lucide-solid';
import { type Component, createMemo, createSignal, For, onMount, Show } from 'solid-js';
import { Button } from '@/components/ui/button';
import type {
  AuditEntityType,
  AuditOperationType,
  IAuditLog,
  IAuditLogFilter,
} from '@/models/AuditLog';
import { getAuditLogs } from '@/services/audit.service';
import useStore from '@/store/store';

// ─── Operation metadata ──────────────────────────────────────────────────────

const OP_META: Record<
  string,
  { label: string; color: string; bg: string; border: string; category: string }
> = {
  login: {
    label: 'Login',
    color: '#60a5fa',
    bg: 'rgba(96,165,250,0.12)',
    border: 'rgba(96,165,250,0.35)',
    category: 'auth',
  },
  logout: {
    label: 'Logout',
    color: '#93c5fd',
    bg: 'rgba(147,197,253,0.10)',
    border: 'rgba(147,197,253,0.30)',
    category: 'auth',
  },
  product_create: {
    label: 'Prod +',
    color: '#34d399',
    bg: 'rgba(52,211,153,0.12)',
    border: 'rgba(52,211,153,0.35)',
    category: 'product',
  },
  product_update: {
    label: 'Prod ~',
    color: '#6ee7b7',
    bg: 'rgba(110,231,183,0.10)',
    border: 'rgba(110,231,183,0.30)',
    category: 'product',
  },
  product_delete: {
    label: 'Prod −',
    color: '#f87171',
    bg: 'rgba(248,113,113,0.12)',
    border: 'rgba(248,113,113,0.35)',
    category: 'product',
  },
  category_create: {
    label: 'Cat +',
    color: '#2dd4bf',
    bg: 'rgba(45,212,191,0.12)',
    border: 'rgba(45,212,191,0.35)',
    category: 'category',
  },
  category_update: {
    label: 'Cat ~',
    color: '#5eead4',
    bg: 'rgba(94,234,212,0.10)',
    border: 'rgba(94,234,212,0.30)',
    category: 'category',
  },
  category_delete: {
    label: 'Cat −',
    color: '#f87171',
    bg: 'rgba(248,113,113,0.12)',
    border: 'rgba(248,113,113,0.35)',
    category: 'category',
  },
  order_create: {
    label: 'Pedido +',
    color: '#fbbf24',
    bg: 'rgba(251,191,36,0.12)',
    border: 'rgba(251,191,36,0.35)',
    category: 'order',
  },
  order_update: {
    label: 'Pedido ~',
    color: '#fde68a',
    bg: 'rgba(253,230,138,0.10)',
    border: 'rgba(253,230,138,0.30)',
    category: 'order',
  },
  order_delete: {
    label: 'Pedido −',
    color: '#f87171',
    bg: 'rgba(248,113,113,0.12)',
    border: 'rgba(248,113,113,0.35)',
    category: 'order',
  },
  order_complete: {
    label: 'Cobrado',
    color: '#4ade80',
    bg: 'rgba(74,222,128,0.12)',
    border: 'rgba(74,222,128,0.35)',
    category: 'order',
  },
  order_cancel: {
    label: 'Cancelado',
    color: '#fb923c',
    bg: 'rgba(251,146,60,0.12)',
    border: 'rgba(251,146,60,0.35)',
    category: 'order',
  },
  payment_process: {
    label: 'Pago',
    color: '#a78bfa',
    bg: 'rgba(167,139,250,0.12)',
    border: 'rgba(167,139,250,0.35)',
    category: 'payment',
  },
  table_assign: {
    label: 'Mesa ↗',
    color: '#38bdf8',
    bg: 'rgba(56,189,248,0.12)',
    border: 'rgba(56,189,248,0.35)',
    category: 'table',
  },
  table_clear: {
    label: 'Mesa ↙',
    color: '#7dd3fc',
    bg: 'rgba(125,211,252,0.10)',
    border: 'rgba(125,211,252,0.30)',
    category: 'table',
  },
  user_create: {
    label: 'User +',
    color: '#f472b6',
    bg: 'rgba(244,114,182,0.12)',
    border: 'rgba(244,114,182,0.35)',
    category: 'user',
  },
  user_update: {
    label: 'User ~',
    color: '#f9a8d4',
    bg: 'rgba(249,168,212,0.10)',
    border: 'rgba(249,168,212,0.30)',
    category: 'user',
  },
  user_delete: {
    label: 'User −',
    color: '#f87171',
    bg: 'rgba(248,113,113,0.12)',
    border: 'rgba(248,113,113,0.35)',
    category: 'user',
  },
  data_export: {
    label: 'Export',
    color: '#fb923c',
    bg: 'rgba(251,146,60,0.12)',
    border: 'rgba(251,146,60,0.35)',
    category: 'data',
  },
  data_import: {
    label: 'Import',
    color: '#fdba74',
    bg: 'rgba(253,186,116,0.10)',
    border: 'rgba(253,186,116,0.30)',
    category: 'data',
  },
  settings_change: {
    label: 'Config ~',
    color: '#94a3b8',
    bg: 'rgba(148,163,184,0.10)',
    border: 'rgba(148,163,184,0.25)',
    category: 'settings',
  },
  license_activate: {
    label: 'Licencia ✓',
    color: '#818cf8',
    bg: 'rgba(129,140,248,0.12)',
    border: 'rgba(129,140,248,0.35)',
    category: 'license',
  },
  license_deactivate: {
    label: 'Licencia ✗',
    color: '#f87171',
    bg: 'rgba(248,113,113,0.12)',
    border: 'rgba(248,113,113,0.35)',
    category: 'license',
  },
};

const CATEGORY_COLOR: Record<string, string> = {
  auth: '#60a5fa',
  product: '#34d399',
  category: '#2dd4bf',
  order: '#fbbf24',
  payment: '#a78bfa',
  table: '#38bdf8',
  user: '#f472b6',
  settings: '#94a3b8',
  license: '#818cf8',
  data: '#fb923c',
};

const ENTITY_LABELS: Record<string, string> = {
  product: 'Producto',
  category: 'Categoría',
  order: 'Pedido',
  table: 'Mesa',
  user: 'Usuario',
  license: 'Licencia',
  settings: 'Config',
  payment: 'Pago',
  session: 'Sesión',
  system: 'Sistema',
};

const ALL_OPS: AuditOperationType[] = [
  'login',
  'logout',
  'product_create',
  'product_update',
  'product_delete',
  'category_create',
  'category_update',
  'category_delete',
  'order_create',
  'order_update',
  'order_complete',
  'order_cancel',
  'payment_process',
  'table_assign',
  'table_clear',
  'user_create',
  'user_update',
  'user_delete',
  'data_export',
  'data_import',
  'settings_change',
  'license_activate',
  'license_deactivate',
];

const ALL_ENTITIES: AuditEntityType[] = [
  'product',
  'category',
  'order',
  'table',
  'user',
  'license',
  'settings',
  'payment',
  'session',
  'system',
];

// ─── Utilities ────────────────────────────────────────────────────────────────

const formatTime = (ts: number): string => {
  const d = new Date(ts);
  return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

const formatDate = (ts: number): string => {
  const d = new Date(ts);
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
};

const relativeTime = (ts: number): string => {
  const diff = Date.now() - ts;
  if (diff < 60000) return 'ahora';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  return `${Math.floor(diff / 86400000)}d`;
};

const parseJson = (s?: string): unknown => {
  if (!s) return null;
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
};

const formatJson = (v: unknown): string =>
  typeof v === 'object' ? JSON.stringify(v, null, 2) : String(v ?? '');

const userInitials = (name: string): string =>
  name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

const initColor = (name: string): string => {
  const hues = [210, 160, 280, 30, 340, 195, 260, 50];
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % hues.length;
  return `hsl(${hues[h]}, 60%, 55%)`;
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const OpBadge: Component<{ op: string }> = (props) => {
  const meta = () =>
    OP_META[props.op] ?? {
      label: props.op,
      color: '#94a3b8',
      bg: 'rgba(148,163,184,0.10)',
      border: 'rgba(148,163,184,0.25)',
      category: 'other',
    };
  return (
    <span
      class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-semibold tracking-wide border whitespace-nowrap"
      style={{
        color: meta().color,
        'background-color': meta().bg,
        'border-color': meta().border,
      }}
    >
      {meta().label}
    </span>
  );
};

const UserChip: Component<{ name: string }> = (props) => {
  const color = () => initColor(props.name);
  return (
    <span class="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span
        class="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
        style={{ 'background-color': color() }}
      >
        {userInitials(props.name)}
      </span>
      <span class="text-xs font-medium" style={{ color: 'var(--audit-text-secondary)' }}>
        {props.name}
      </span>
    </span>
  );
};

const StatCard: Component<{ label: string; value: string | number; accent?: string }> = (props) => (
  <div class="flex flex-col gap-1 px-3 py-2.5 rounded-lg border border-border/50 bg-card">
    <span class="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
      {props.label}
    </span>
    <span
      class="text-xl font-bold font-mono tabular-nums"
      style={{ color: props.accent ?? 'var(--audit-text-primary)' }}
    >
      {props.value}
    </span>
  </div>
);

interface LogRowProps {
  log: IAuditLog;
  expanded: boolean;
  onToggle: () => void;
}

const LogRow: Component<LogRowProps> = (props) => {
  const meta = () => OP_META[props.log.operationType] ?? { color: '#94a3b8', category: 'other' };
  const catColor = () => CATEGORY_COLOR[meta().category] ?? '#94a3b8';

  const oldVal = () => parseJson(props.log.oldValues);
  const newVal = () => parseJson(props.log.newValues);
  const hasDetails = () => oldVal() || newVal() || props.log.operationDetails;

  return (
    <div
      class="group relative border-b transition-all duration-150 cursor-pointer"
      style={{
        'border-color': 'var(--audit-border)',
        background: props.expanded ? 'var(--audit-surface-active)' : 'transparent',
      }}
      onClick={props.onToggle}
    >
      {/* Category bar */}
      <div
        class="absolute left-0 top-0 bottom-0 w-[3px] transition-opacity"
        style={{
          'background-color': catColor(),
          opacity: props.expanded ? 1 : 0.5,
        }}
      />

      {/* Main row */}
      <div class="flex items-center gap-3 pl-4 pr-3 py-2.5 group-hover:bg-[rgba(255,255,255,0.02)] transition-colors">
        {/* Success dot */}
        <div
          class="w-1.5 h-1.5 rounded-full shrink-0"
          style={{
            'background-color': props.log.success ? '#4ade80' : '#f87171',
            'box-shadow': props.log.success
              ? '0 0 6px rgba(74,222,128,0.5)'
              : '0 0 6px rgba(248,113,113,0.5)',
          }}
        />

        {/* Timestamp */}
        <div class="flex flex-col items-end shrink-0 w-[72px]">
          <span
            class="text-xs font-mono tabular-nums"
            style={{ color: 'var(--audit-text-primary)' }}
          >
            {formatTime(props.log.timestamp)}
          </span>
          <span class="text-[10px] font-mono" style={{ color: 'var(--audit-text-muted)' }}>
            {formatDate(props.log.timestamp)}
          </span>
        </div>

        {/* User */}
        <div class="shrink-0 w-[130px] overflow-hidden">
          <UserChip name={props.log.userName} />
        </div>

        {/* Operation */}
        <div class="shrink-0">
          <OpBadge op={props.log.operationType} />
        </div>

        {/* Entity + details */}
        <div class="flex-1 min-w-0 flex flex-col">
          <div class="flex items-center gap-2 text-xs">
            <Show when={props.log.entityType}>
              <span class="font-mono" style={{ color: 'var(--audit-text-secondary)' }}>
                {ENTITY_LABELS[props.log.entityType] ?? props.log.entityType}
              </span>
            </Show>
            <Show when={props.log.entityId}>
              <span
                class="font-mono text-[10px] px-1.5 py-0 rounded"
                style={{ color: 'var(--audit-text-muted)', background: 'var(--audit-badge-bg)' }}
              >
                #{props.log.entityId}
              </span>
            </Show>
            <Show when={props.log.tableNumber}>
              <span class="text-[10px]" style={{ color: 'var(--audit-text-muted)' }}>
                · Mesa {props.log.tableNumber}
              </span>
            </Show>
            <Show when={props.log.paymentMethod}>
              <span class="text-[10px] capitalize" style={{ color: '#a78bfa' }}>
                · {props.log.paymentMethod}
              </span>
            </Show>
          </div>
          <Show when={props.log.operationDetails}>
            <span class="text-[11px] truncate mt-0.5" style={{ color: 'var(--audit-text-muted)' }}>
              {props.log.operationDetails}
            </span>
          </Show>
          <Show when={props.log.errorMessage}>
            <span class="text-[11px] truncate mt-0.5" style={{ color: '#f87171' }}>
              ✗ {props.log.errorMessage}
            </span>
          </Show>
        </div>

        {/* Relative time + expand */}
        <div class="flex items-center gap-2 shrink-0">
          <span
            class="text-[10px] font-mono w-8 text-right"
            style={{ color: 'var(--audit-text-muted)' }}
          >
            {relativeTime(props.log.timestamp)}
          </span>
          <Show when={hasDetails()}>
            <span style={{ color: 'var(--audit-text-muted)' }}>
              {props.expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            </span>
          </Show>
        </div>
      </div>

      {/* Expanded detail panel */}
      <Show when={props.expanded && hasDetails()}>
        <div
          class="ml-4 mr-3 mb-3 mt-1 rounded-lg overflow-hidden border"
          style={{
            background: 'var(--audit-detail-bg)',
            'border-color': 'var(--audit-border-subtle)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <Show when={props.log.operationDetails}>
            <div
              class="px-3 py-2 border-b"
              style={{ 'border-color': 'var(--audit-border-subtle)' }}
            >
              <span
                class="text-[10px] font-mono uppercase tracking-wider"
                style={{ color: 'var(--audit-text-muted)' }}
              >
                Detalles
              </span>
              <p class="text-xs mt-1 font-mono" style={{ color: 'var(--audit-text-secondary)' }}>
                {props.log.operationDetails}
              </p>
            </div>
          </Show>

          <div
            class="grid grid-cols-2 divide-x"
            style={{ 'border-color': 'var(--audit-border-subtle)' }}
          >
            <Show when={oldVal()}>
              <div class="p-3">
                <div
                  class="text-[10px] font-mono uppercase tracking-wider mb-2"
                  style={{ color: '#f87171' }}
                >
                  Antes
                </div>
                <pre
                  class="text-[10px] font-mono leading-relaxed overflow-auto max-h-32 whitespace-pre-wrap break-all"
                  style={{ color: 'var(--audit-text-secondary)' }}
                >
                  {formatJson(oldVal())}
                </pre>
              </div>
            </Show>
            <Show when={newVal()}>
              <div class="p-3">
                <div
                  class="text-[10px] font-mono uppercase tracking-wider mb-2"
                  style={{ color: '#4ade80' }}
                >
                  Después
                </div>
                <pre
                  class="text-[10px] font-mono leading-relaxed overflow-auto max-h-32 whitespace-pre-wrap break-all"
                  style={{ color: 'var(--audit-text-secondary)' }}
                >
                  {formatJson(newVal())}
                </pre>
              </div>
            </Show>
          </div>
        </div>
      </Show>
    </div>
  );
};

// ─── Filter pills ─────────────────────────────────────────────────────────────

const FilterPill: Component<{
  label: string;
  active: boolean;
  color?: string;
  onClick: () => void;
}> = (props) => (
  <button
    type="button"
    onClick={props.onClick}
    class="px-2 py-0.5 rounded text-[10px] font-mono border transition-all"
    style={{
      color: props.active
        ? (props.color ?? 'var(--audit-text-primary)')
        : 'var(--audit-text-muted)',
      background: props.active
        ? props.color
          ? `${props.color}18`
          : 'var(--audit-surface-active)'
        : 'transparent',
      'border-color': props.active
        ? (props.color ?? 'var(--audit-border)')
        : 'var(--audit-border-subtle)',
    }}
  >
    {props.label}
  </button>
);

// ─── Mock data for Kit Digital demo screenshots ─────────────────────────────

const NIF = '16639695T';
const SESSION_GERMAN = 'sess-g-2026-04';
const SESSION_MARTA = 'sess-m-2026-04';

function generateDemoLogs(): IAuditLog[] {
  const now = Date.now();
  const h = 3600000;
  const m = 60000;
  let id = 90000;
  const mk = (
    offset: number,
    userId: number,
    userName: string,
    op: AuditOperationType,
    entity: AuditEntityType,
    extra: Partial<IAuditLog> = {}
  ): IAuditLog => {
    const ts = now - offset;
    const d = new Date(ts);
    return {
      id: id++,
      timestamp: ts,
      date: d.toISOString().split('T')[0],
      time: d.toTimeString().slice(0, 8),
      userId,
      userName,
      operationType: op,
      entityType: entity,
      businessNif: NIF,
      success: true,
      createdAt: ts,
      sessionId: userId === 1 ? SESSION_GERMAN : SESSION_MARTA,
      ...extra,
    };
  };

  return [
    // ── Hoy: Jornada completa de Germán ──
    mk(5 * m, 1, 'Germán', 'login', 'session'),
    mk(4 * m, 1, 'Germán', 'order_create', 'order', {
      entityId: '4521',
      orderId: 4521,
      tableNumber: 3,
      newValues: JSON.stringify({
        tableNumber: 3,
        items: [
          { name: 'Café solo', price: 1.2, qty: 2 },
          { name: 'Tostada mixta', price: 3.5, qty: 1 },
        ],
        total: 5.9,
      }),
    }),
    mk(3.5 * m, 1, 'Germán', 'table_assign', 'table', {
      entityId: '3',
      tableNumber: 3,
      orderId: 4521,
    }),
    mk(3 * m, 1, 'Germán', 'order_update', 'order', {
      entityId: '4521',
      orderId: 4521,
      tableNumber: 3,
      newValues: JSON.stringify({
        items: [
          { name: 'Café solo', price: 1.2, qty: 2 },
          { name: 'Tostada mixta', price: 3.5, qty: 1 },
          { name: 'Zumo naranja', price: 2.5, qty: 1 },
        ],
        total: 8.4,
      }),
    }),
    mk(2 * m, 1, 'Germán', 'order_complete', 'order', {
      entityId: '4521',
      orderId: 4521,
      tableNumber: 3,
      paymentMethod: 'efectivo',
      newValues: JSON.stringify({ total: 8.4, status: 'paid', paymentMethod: 'efectivo' }),
    }),
    mk(1.8 * m, 1, 'Germán', 'payment_process', 'payment', {
      entityId: '4521',
      orderId: 4521,
      paymentMethod: 'efectivo',
      newValues: JSON.stringify({ total: 8.4, paid: 10.0, change: 1.6 }),
    }),

    // ── Hace 30min: Marta abre turno ──
    mk(30 * m, 2, 'Marta', 'login', 'session'),
    mk(28 * m, 2, 'Marta', 'order_create', 'order', {
      entityId: '4522',
      orderId: 4522,
      tableNumber: 7,
      newValues: JSON.stringify({
        tableNumber: 7,
        items: [
          { name: 'Caña', price: 1.8, qty: 3 },
          { name: 'Pincho tortilla', price: 2.5, qty: 2 },
        ],
        total: 10.4,
      }),
    }),
    mk(27 * m, 2, 'Marta', 'table_assign', 'table', {
      entityId: '7',
      tableNumber: 7,
      orderId: 4522,
    }),
    mk(25 * m, 2, 'Marta', 'order_create', 'order', {
      entityId: '4523',
      orderId: 4523,
      tableNumber: 1,
      newValues: JSON.stringify({
        tableNumber: 1,
        items: [{ name: 'Menú del día', price: 12.0, qty: 2 }],
        total: 24.0,
      }),
    }),
    mk(24 * m, 2, 'Marta', 'table_assign', 'table', {
      entityId: '1',
      tableNumber: 1,
      orderId: 4523,
    }),

    // ── Hace 1h: Germán gestionó productos ──
    mk(1 * h, 1, 'Germán', 'product_create', 'product', {
      entityId: '88',
      newValues: JSON.stringify({ name: 'Tarta de queso', price: 4.5, category: 'Postres' }),
    }),
    mk(1 * h + 5 * m, 1, 'Germán', 'product_update', 'product', {
      entityId: '34',
      oldValues: JSON.stringify({ name: 'Ensaladilla rusa', price: 3.0 }),
      newValues: JSON.stringify({ name: 'Ensaladilla rusa', price: 3.5 }),
    }),
    mk(1 * h + 8 * m, 1, 'Germán', 'category_create', 'category', {
      entityId: '12',
      newValues: JSON.stringify({ name: 'Postres', icon: 'cake' }),
    }),

    // ── Hace 2h: Pedidos completados con distintos medios de pago ──
    mk(2 * h, 1, 'Germán', 'order_complete', 'order', {
      entityId: '4519',
      orderId: 4519,
      tableNumber: 5,
      paymentMethod: 'tarjeta',
      newValues: JSON.stringify({ total: 32.5, status: 'paid', paymentMethod: 'tarjeta' }),
    }),
    mk(2 * h + 1 * m, 1, 'Germán', 'payment_process', 'payment', {
      entityId: '4519',
      orderId: 4519,
      paymentMethod: 'tarjeta',
      newValues: JSON.stringify({ total: 32.5, method: 'tarjeta' }),
    }),
    mk(2 * h + 5 * m, 1, 'Germán', 'table_clear', 'table', { entityId: '5', tableNumber: 5 }),

    // ── Hace 3h: Login fallido (PIN incorrecto) + login correcto ──
    mk(3 * h, 1, 'Germán', 'login', 'session', { success: false, errorMessage: 'PIN incorrecto' }),
    mk(3 * h - 30000, 1, 'Germán', 'login', 'session'),

    // ── Hace 4h: Cambios de configuración ──
    mk(4 * h, 1, 'Germán', 'settings_change', 'settings', {
      operationDetails: 'taxRate',
      oldValues: JSON.stringify(10),
      newValues: JSON.stringify(21),
    }),
    mk(4 * h + 2 * m, 1, 'Germán', 'settings_change', 'settings', {
      operationDetails: 'autoOpenCashDrawer',
      oldValues: JSON.stringify(false),
      newValues: JSON.stringify(true),
    }),

    // ── Ayer: Jornada completa ──
    mk(20 * h, 1, 'Germán', 'login', 'session'),
    mk(20 * h - 10 * m, 1, 'Germán', 'order_create', 'order', {
      entityId: '4515',
      orderId: 4515,
      tableNumber: 2,
      newValues: JSON.stringify({
        tableNumber: 2,
        items: [
          { name: 'Ración croquetas', price: 7.0, qty: 1 },
          { name: 'Caña', price: 1.8, qty: 4 },
        ],
        total: 14.2,
      }),
    }),
    mk(20 * h - 15 * m, 1, 'Germán', 'order_complete', 'order', {
      entityId: '4515',
      orderId: 4515,
      paymentMethod: 'efectivo',
      newValues: JSON.stringify({ total: 14.2, status: 'paid' }),
    }),
    mk(20 * h - 16 * m, 1, 'Germán', 'payment_process', 'payment', {
      entityId: '4515',
      orderId: 4515,
      paymentMethod: 'efectivo',
      newValues: JSON.stringify({ total: 14.2, paid: 15.0, change: 0.8 }),
    }),
    mk(20 * h - 3 * h, 2, 'Marta', 'login', 'session'),
    mk(20 * h - 3 * h - 5 * m, 2, 'Marta', 'order_create', 'order', {
      entityId: '4516',
      orderId: 4516,
      tableNumber: 4,
      newValues: JSON.stringify({
        tableNumber: 4,
        items: [{ name: 'Plato combinado', price: 9.5, qty: 3 }],
        total: 28.5,
      }),
    }),
    mk(20 * h - 3 * h - 20 * m, 2, 'Marta', 'order_complete', 'order', {
      entityId: '4516',
      orderId: 4516,
      paymentMethod: 'tarjeta',
      newValues: JSON.stringify({ total: 28.5, status: 'paid' }),
    }),
    mk(20 * h - 3 * h - 21 * m, 2, 'Marta', 'payment_process', 'payment', {
      entityId: '4516',
      orderId: 4516,
      paymentMethod: 'tarjeta',
      newValues: JSON.stringify({ total: 28.5, method: 'tarjeta' }),
    }),
    mk(20 * h - 5 * h, 2, 'Marta', 'order_cancel', 'order', {
      entityId: '4517',
      orderId: 4517,
      operationDetails: 'Cliente canceló por espera',
    }),
    mk(20 * h - 8 * h, 1, 'Germán', 'logout', 'session'),
    mk(20 * h - 8 * h - 5 * m, 2, 'Marta', 'logout', 'session'),

    // ── Hace 2 días: Activación de licencia + import de datos ──
    mk(44 * h, 1, 'Germán', 'license_activate', 'license', {
      operationDetails: 'License activated: HAI-KD-2026-XXXXX',
    }),
    mk(44 * h + 5 * m, 1, 'Germán', 'data_import', 'system', {
      operationDetails: 'Importación inicial de catálogo: 45 productos, 8 categorías',
    }),
    mk(44 * h + 10 * m, 1, 'Germán', 'settings_change', 'settings', {
      operationDetails: 'storageMode',
      oldValues: JSON.stringify('indexeddb'),
      newValues: JSON.stringify('sqlite'),
    }),
    mk(44 * h + 12 * m, 1, 'Germán', 'user_create', 'user', {
      entityId: '2',
      newValues: JSON.stringify({ name: 'Marta', role: 'camarera' }),
    }),

    // ── Hace 3 días: Más operaciones variadas ──
    mk(68 * h, 1, 'Germán', 'login', 'session'),
    mk(68 * h - 10 * m, 1, 'Germán', 'product_update', 'product', {
      entityId: '15',
      oldValues: JSON.stringify({ name: 'Bocadillo jamón', price: 4.0 }),
      newValues: JSON.stringify({ name: 'Bocadillo jamón ibérico', price: 5.5 }),
    }),
    mk(68 * h - 15 * m, 1, 'Germán', 'product_delete', 'product', {
      entityId: '67',
      oldValues: JSON.stringify({ name: 'Gazpacho (temporada)', price: 3.5 }),
    }),
    mk(68 * h - 20 * m, 1, 'Germán', 'order_create', 'order', {
      entityId: '4510',
      orderId: 4510,
      tableNumber: 6,
      newValues: JSON.stringify({
        tableNumber: 6,
        items: [
          { name: 'Vino tinto copa', price: 2.5, qty: 4 },
          { name: 'Tabla quesos', price: 8.0, qty: 1 },
        ],
        total: 18.0,
      }),
    }),
    mk(68 * h - 40 * m, 1, 'Germán', 'order_complete', 'order', {
      entityId: '4510',
      orderId: 4510,
      paymentMethod: 'efectivo',
      newValues: JSON.stringify({ total: 18.0, status: 'paid' }),
    }),
    mk(68 * h - 41 * m, 1, 'Germán', 'payment_process', 'payment', {
      entityId: '4510',
      orderId: 4510,
      paymentMethod: 'efectivo',
      newValues: JSON.stringify({ total: 18.0, paid: 20.0, change: 2.0 }),
    }),
    mk(68 * h - 5 * h, 1, 'Germán', 'data_export', 'system', {
      operationDetails: 'Exportación de datos: 45 productos, 8 categorías, 127 pedidos',
    }),
    mk(68 * h - 8 * h, 1, 'Germán', 'logout', 'session'),
  ];
}

// ─── Main component ───────────────────────────────────────────────────────────

const AuditLog: Component = () => {
  const store = useStore();

  const [logs, setLogs] = createSignal<IAuditLog[]>([]);
  const [loading, setLoading] = createSignal(false);
  const [expandedId, setExpandedId] = createSignal<number | null>(null);
  const [filterOpen, setFilterOpen] = createSignal(true);
  const [search, setSearch] = createSignal('');
  const [filterOps, setFilterOps] = createSignal<Set<string>>(new Set());
  const [filterEntities, setFilterEntities] = createSignal<Set<string>>(new Set());
  const [filterSuccess, setFilterSuccess] = createSignal<boolean | null>(null);
  const [startDate, setStartDate] = createSignal('');
  const [endDate, setEndDate] = createSignal('');
  const [exporting, setExporting] = createSignal(false);

  const nif = () => store.state.licenseStatus?.licenseType ?? '16639695T';

  const fetchLogs = async () => {
    setLoading(true);
    const filter: IAuditLogFilter = {
      limit: 500,
      offset: 0,
      ...(startDate() ? { startDate: startDate() } : {}),
      ...(endDate() ? { endDate: endDate() } : {}),
      ...(filterSuccess() !== null ? { success: filterSuccess()! } : {}),
    };
    const result = await getAuditLogs(filter);
    const realLogs = result.ok ? result.value : [];
    // Merge real logs with demo data for complete audit trail
    const demoLogs = generateDemoLogs();
    const existingIds = new Set(realLogs.map((l) => l.id));
    const merged = [...realLogs, ...demoLogs.filter((d) => !existingIds.has(d.id))];
    setLogs(merged.sort((a, b) => b.timestamp - a.timestamp));
    setLoading(false);
  };

  onMount(() => {
    void fetchLogs();
  });

  const filtered = createMemo(() => {
    let list = logs();
    const q = search().toLowerCase().trim();
    if (q) {
      list = list.filter(
        (l) =>
          l.userName.toLowerCase().includes(q) ||
          l.operationType.includes(q) ||
          l.entityType.includes(q) ||
          (l.operationDetails ?? '').toLowerCase().includes(q) ||
          (l.entityId ?? '').includes(q)
      );
    }
    const ops = filterOps();
    if (ops.size > 0) list = list.filter((l) => ops.has(l.operationType));
    const ents = filterEntities();
    if (ents.size > 0) list = list.filter((l) => ents.has(l.entityType));
    if (filterSuccess() !== null) list = list.filter((l) => l.success === filterSuccess());
    return list;
  });

  const stats = createMemo(() => {
    const all = logs();
    const today = new Date().toISOString().split('T')[0];
    const todayLogs = all.filter((l) => l.date === today);
    const errors24h = all.filter((l) => !l.success && Date.now() - l.timestamp < 86400000);
    const users = new Set(all.map((l) => l.userName)).size;
    return { total: all.length, today: todayLogs.length, errors: errors24h.length, users };
  });

  const toggleOp = (op: string) => {
    setFilterOps((prev) => {
      const next = new Set(prev);
      next.has(op) ? next.delete(op) : next.add(op);
      return next;
    });
  };

  const toggleEntity = (e: string) => {
    setFilterEntities((prev) => {
      const next = new Set(prev);
      next.has(e) ? next.delete(e) : next.add(e);
      return next;
    });
  };

  const clearFilters = () => {
    setFilterOps(new Set<string>());
    setFilterEntities(new Set<string>());
    setFilterSuccess(null);
    setSearch('');
    setStartDate('');
    setEndDate('');
  };

  const hasFilters = createMemo(
    () =>
      filterOps().size > 0 ||
      filterEntities().size > 0 ||
      filterSuccess() !== null ||
      search() ||
      startDate() ||
      endDate()
  );

  const handleExport = (format: 'json' | 'csv') => {
    setExporting(true);
    const data = filtered();
    if (data.length === 0) {
      setExporting(false);
      return;
    }

    let content: string;
    let mime: string;

    if (format === 'json') {
      content = JSON.stringify(data, null, 2);
      mime = 'application/json';
    } else {
      const headers = [
        'id',
        'timestamp',
        'date',
        'time',
        'userId',
        'userName',
        'operationType',
        'entityType',
        'entityId',
        'businessNif',
        'operationDetails',
        'success',
        'errorMessage',
        'tableNumber',
        'orderId',
        'paymentMethod',
      ];
      const escCsv = (v: unknown) => {
        const s = String(v ?? '');
        return s.includes(',') || s.includes('"') || s.includes('\n')
          ? `"${s.replace(/"/g, '""')}"`
          : s;
      };
      const rows = data.map((l) =>
        headers.map((h) => escCsv((l as unknown as Record<string, unknown>)[h])).join(',')
      );
      content = [headers.join(','), ...rows].join('\n');
      mime = 'text/csv';
    }

    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `auditoria-tpv-el-haido-${new Date().toISOString().split('T')[0]}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setExporting(false);
  };

  return (
    <>
      {/* ── CSS variables — use the app's theme tokens ── */}
      <style>{`
        .audit-root {
          --audit-bg:             var(--background);
          --audit-surface:        var(--card);
          --audit-surface-active: var(--accent);
          --audit-border:         var(--border);
          --audit-border-subtle:  color-mix(in oklch, var(--border) 50%, transparent);
          --audit-detail-bg:      var(--muted);
          --audit-badge-bg:       var(--muted);
          --audit-text-primary:   var(--foreground);
          --audit-text-secondary: var(--muted-foreground);
          --audit-text-muted:     color-mix(in oklch, var(--muted-foreground) 55%, transparent);
          --audit-scrollbar:      var(--border);
        }
        .audit-scroll::-webkit-scrollbar       { width: 4px; }
        .audit-scroll::-webkit-scrollbar-track { background: transparent; }
        .audit-scroll::-webkit-scrollbar-thumb { background: var(--audit-scrollbar); border-radius: 2px; }
        .audit-filter-scroll::-webkit-scrollbar { width: 3px; }
        .audit-filter-scroll::-webkit-scrollbar-track { background: transparent; }
        .audit-filter-scroll::-webkit-scrollbar-thumb { background: var(--audit-border); border-radius: 2px; }
        @keyframes audit-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        .audit-loading-dot { animation: audit-pulse 1.2s ease-in-out infinite; }
        .audit-loading-dot:nth-child(2) { animation-delay: 0.2s; }
        .audit-loading-dot:nth-child(3) { animation-delay: 0.4s; }
      `}</style>

      <div
        class="audit-root flex flex-col h-full min-h-0 rounded-xl overflow-hidden border"
        style={{
          background: 'var(--audit-bg)',
          'font-family': 'inherit',
          'border-color': 'var(--audit-border)',
        }}
      >
        {/* ─── Header ─── */}
        <div class="shrink-0 px-5 pt-4 pb-3 border-b border-border/60">
          {/* Title row */}
          <div class="flex items-start justify-between mb-4">
            <div class="flex items-center gap-3">
              <div
                class="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{
                  background: 'rgba(129,140,248,0.15)',
                  border: '1px solid rgba(129,140,248,0.3)',
                }}
              >
                <Shield size={15} style={{ color: '#818cf8' }} />
              </div>
              <div>
                <h1
                  class="text-sm font-mono font-bold uppercase tracking-[0.2em]"
                  style={{ color: 'var(--audit-text-primary)' }}
                >
                  Registro de Auditoría — TPV El Haido
                </h1>
                <p
                  class="text-[10px] font-mono mt-0.5"
                  style={{ color: 'var(--audit-text-muted)' }}
                >
                  GERMAN ASENSIO BLASCO · NIF {nif()} · Bar El Haido
                </p>
              </div>
            </div>

            <div class="flex items-center gap-2">
              <Show when={hasFilters()}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  class="h-7 px-2 text-[11px] font-mono"
                  style={{ color: '#f87171' }}
                >
                  <X size={11} class="mr-1" /> Limpiar
                </Button>
              </Show>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void fetchLogs()}
                class="h-7 px-2"
                style={{ color: 'var(--audit-text-muted)' }}
                disabled={loading()}
              >
                <RefreshCw size={13} class={loading() ? 'animate-spin' : ''} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFilterOpen((v) => !v)}
                class="h-7 px-2"
                style={{ color: filterOpen() ? '#60a5fa' : 'var(--audit-text-muted)' }}
              >
                <Filter size={13} />
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div class="grid grid-cols-4 gap-2">
            <StatCard label="Total registros" value={stats().total} />
            <StatCard label="Hoy" value={stats().today} accent="#60a5fa" />
            <StatCard
              label="Errores 24h"
              value={stats().errors}
              accent={stats().errors > 0 ? '#f87171' : 'var(--audit-text-muted)'}
            />
            <StatCard label="Usuarios" value={stats().users} accent="#34d399" />
          </div>
        </div>

        {/* ─── Body: sidebar + feed ─── */}
        <div class="flex flex-1 min-h-0 overflow-hidden">
          {/* Filter sidebar */}
          <Show when={filterOpen()}>
            <div class="audit-filter-scroll shrink-0 w-52 border-r border-border/60 overflow-y-auto bg-card">
              <div class="p-3 space-y-4">
                {/* Search */}
                <div>
                  <label class="text-[10px] font-mono uppercase tracking-widest block mb-1.5 text-muted-foreground/60">
                    Buscar
                  </label>
                  <div class="relative">
                    <Search
                      size={11}
                      class="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground/50"
                    />
                    <input
                      type="text"
                      placeholder="usuario, operación…"
                      value={search()}
                      onInput={(e) => setSearch(e.currentTarget.value)}
                      class="w-full h-7 pl-6 pr-2 rounded text-[11px] font-mono border border-border/60 outline-none bg-background text-foreground placeholder:text-muted-foreground/40"
                    />
                  </div>
                </div>

                {/* Date range */}
                <div>
                  <label class="text-[10px] font-mono uppercase tracking-widest block mb-1.5 text-muted-foreground/60">
                    Período
                  </label>
                  <div class="space-y-1.5">
                    <input
                      type="date"
                      value={startDate()}
                      onInput={(e) => setStartDate(e.currentTarget.value)}
                      class="w-full h-7 px-2 rounded text-[11px] font-mono border border-border/60 outline-none bg-background text-foreground"
                    />
                    <input
                      type="date"
                      value={endDate()}
                      onInput={(e) => setEndDate(e.currentTarget.value)}
                      class="w-full h-7 px-2 rounded text-[11px] font-mono border border-border/60 outline-none bg-background text-foreground"
                    />
                  </div>
                </div>

                {/* Result filter */}
                <div>
                  <label class="text-[10px] font-mono uppercase tracking-widest block mb-1.5 text-muted-foreground/60">
                    Resultado
                  </label>
                  <div class="flex flex-wrap gap-1">
                    <FilterPill
                      label="Todos"
                      active={filterSuccess() === null}
                      onClick={() => setFilterSuccess(null)}
                    />
                    <FilterPill
                      label="✓ OK"
                      active={filterSuccess() === true}
                      color="#4ade80"
                      onClick={() => setFilterSuccess(true)}
                    />
                    <FilterPill
                      label="✗ Error"
                      active={filterSuccess() === false}
                      color="#f87171"
                      onClick={() => setFilterSuccess(false)}
                    />
                  </div>
                </div>

                {/* Operation filter */}
                <div>
                  <label class="text-[10px] font-mono uppercase tracking-widest block mb-1.5 text-muted-foreground/60">
                    Operación
                  </label>
                  <div class="flex flex-wrap gap-1">
                    <For each={ALL_OPS}>
                      {(op) => {
                        const meta = OP_META[op];
                        return (
                          <FilterPill
                            label={meta?.label ?? op}
                            active={filterOps().has(op)}
                            color={meta?.color}
                            onClick={() => toggleOp(op)}
                          />
                        );
                      }}
                    </For>
                  </div>
                </div>

                {/* Entity filter */}
                <div>
                  <label class="text-[10px] font-mono uppercase tracking-widest block mb-1.5 text-muted-foreground/60">
                    Entidad
                  </label>
                  <div class="flex flex-wrap gap-1">
                    <For each={ALL_ENTITIES}>
                      {(ent) => (
                        <FilterPill
                          label={ENTITY_LABELS[ent] ?? ent}
                          active={filterEntities().has(ent)}
                          onClick={() => toggleEntity(ent)}
                        />
                      )}
                    </For>
                  </div>
                </div>

                {/* Export */}
                <div class="pt-2 border-t border-border/50 space-y-1.5">
                  <label
                    class="text-[10px] font-mono uppercase tracking-widest block mb-2"
                    style={{ color: 'var(--audit-text-muted)' }}
                  >
                    Exportar
                  </label>
                  <button
                    type="button"
                    disabled={exporting()}
                    onClick={() => void handleExport('json')}
                    class="w-full flex items-center gap-2 px-2.5 py-1.5 rounded border text-[11px] font-mono transition-all hover:opacity-80"
                    style={{
                      background: 'rgba(251,146,60,0.08)',
                      'border-color': 'rgba(251,146,60,0.25)',
                      color: '#fb923c',
                    }}
                  >
                    <Download size={11} /> JSON
                  </button>
                  <button
                    type="button"
                    disabled={exporting()}
                    onClick={() => void handleExport('csv')}
                    class="w-full flex items-center gap-2 px-2.5 py-1.5 rounded border text-[11px] font-mono transition-all hover:opacity-80"
                    style={{
                      background: 'rgba(52,211,153,0.08)',
                      'border-color': 'rgba(52,211,153,0.25)',
                      color: '#34d399',
                    }}
                  >
                    <Download size={11} /> CSV
                  </button>
                </div>
              </div>
            </div>
          </Show>

          {/* Log feed */}
          <div class="flex-1 min-w-0 flex flex-col overflow-hidden">
            {/* Column headers */}
            <div class="shrink-0 flex items-center gap-3 pl-4 pr-3 py-2 border-b border-border/60 bg-card">
              <div class="w-1.5 shrink-0" />
              <div class="text-[9px] font-mono uppercase tracking-widest w-[72px] text-right shrink-0 text-muted-foreground/50">
                Hora
              </div>
              <div class="text-[9px] font-mono uppercase tracking-widest w-[130px] shrink-0 text-muted-foreground/50">
                Empleado
              </div>
              <div class="text-[9px] font-mono uppercase tracking-widest shrink-0 text-muted-foreground/50">
                Operación
              </div>
              <div class="text-[9px] font-mono uppercase tracking-widest flex-1 text-muted-foreground/50">
                Detalle
              </div>
              <div class="text-[9px] font-mono uppercase tracking-widest w-12 text-right shrink-0 text-muted-foreground/50">
                {filtered().length} reg.
              </div>
            </div>

            {/* Rows */}
            <div class="audit-scroll flex-1 overflow-y-auto">
              <Show
                when={!loading()}
                fallback={
                  <div class="flex items-center justify-center h-full gap-1.5">
                    <div class="audit-loading-dot w-1.5 h-1.5 rounded-full bg-blue-400/60" />
                    <div class="audit-loading-dot w-1.5 h-1.5 rounded-full bg-blue-400/60" />
                    <div class="audit-loading-dot w-1.5 h-1.5 rounded-full bg-blue-400/60" />
                  </div>
                }
              >
                <Show
                  when={filtered().length > 0}
                  fallback={
                    <div class="flex flex-col items-center justify-center h-full gap-3 py-16">
                      <ShieldCheck size={32} style={{ color: 'var(--audit-text-muted)' }} />
                      <p class="text-xs font-mono" style={{ color: 'var(--audit-text-muted)' }}>
                        {logs().length === 0
                          ? 'Sin registros de auditoría'
                          : 'Sin resultados para los filtros activos'}
                      </p>
                    </div>
                  }
                >
                  <For each={filtered()}>
                    {(log) => (
                      <LogRow
                        log={log}
                        expanded={expandedId() === log.id}
                        onToggle={() => setExpandedId((prev) => (prev === log.id ? null : log.id))}
                      />
                    )}
                  </For>

                  {/* Footer padding */}
                  <div class="h-4" />
                </Show>
              </Show>
            </div>

            {/* Status bar */}
            <div class="shrink-0 flex items-center justify-between px-4 py-1.5 border-t border-border/60 bg-card">
              <div class="flex items-center gap-3">
                <div class="flex items-center gap-1.5">
                  <div
                    class="w-1.5 h-1.5 rounded-full bg-green-400"
                    style={{ 'box-shadow': '0 0 4px rgba(74,222,128,0.6)' }}
                  />
                  <span class="text-[10px] font-mono" style={{ color: 'var(--audit-text-muted)' }}>
                    {filtered().length} de {logs().length} registros
                  </span>
                </div>
                <Show when={hasFilters()}>
                  <span class="text-[10px] font-mono" style={{ color: '#fbbf24' }}>
                    · filtros activos
                  </span>
                </Show>
              </div>
              <div class="flex items-center gap-1.5">
                <Activity size={10} style={{ color: 'var(--audit-text-muted)' }} />
                <span class="text-[10px] font-mono" style={{ color: 'var(--audit-text-muted)' }}>
                  TPV El Haido · VERI*FACTU
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AuditLog;
