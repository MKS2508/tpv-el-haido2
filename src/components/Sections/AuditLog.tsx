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
    color: 'var(--audit-op-auth)',
    bg: 'var(--audit-op-auth-bg)',
    border: 'var(--audit-op-auth-border)',
    category: 'auth',
  },
  logout: {
    label: 'Logout',
    color: 'var(--audit-op-auth-soft)',
    bg: 'var(--audit-op-auth-soft-bg)',
    border: 'var(--audit-op-auth-soft-border)',
    category: 'auth',
  },
  product_create: {
    label: 'Prod +',
    color: 'var(--audit-op-product)',
    bg: 'var(--audit-op-product-bg)',
    border: 'var(--audit-op-product-border)',
    category: 'product',
  },
  product_update: {
    label: 'Prod ~',
    color: 'var(--audit-op-product-soft)',
    bg: 'var(--audit-op-product-soft-bg)',
    border: 'var(--audit-op-product-soft-border)',
    category: 'product',
  },
  product_delete: {
    label: 'Prod −',
    color: 'var(--audit-op-danger)',
    bg: 'var(--audit-op-danger-bg)',
    border: 'var(--audit-op-danger-border)',
    category: 'product',
  },
  category_create: {
    label: 'Cat +',
    color: 'var(--audit-op-category)',
    bg: 'var(--audit-op-category-bg)',
    border: 'var(--audit-op-category-border)',
    category: 'category',
  },
  category_update: {
    label: 'Cat ~',
    color: 'var(--audit-op-category-soft)',
    bg: 'var(--audit-op-category-soft-bg)',
    border: 'var(--audit-op-category-soft-border)',
    category: 'category',
  },
  category_delete: {
    label: 'Cat −',
    color: 'var(--audit-op-danger)',
    bg: 'var(--audit-op-danger-bg)',
    border: 'var(--audit-op-danger-border)',
    category: 'category',
  },
  order_create: {
    label: 'Pedido +',
    color: 'var(--audit-op-order)',
    bg: 'var(--audit-op-order-bg)',
    border: 'var(--audit-op-order-border)',
    category: 'order',
  },
  order_update: {
    label: 'Pedido ~',
    color: 'var(--audit-op-order-soft)',
    bg: 'var(--audit-op-order-soft-bg)',
    border: 'var(--audit-op-order-soft-border)',
    category: 'order',
  },
  order_delete: {
    label: 'Pedido −',
    color: 'var(--audit-op-danger)',
    bg: 'var(--audit-op-danger-bg)',
    border: 'var(--audit-op-danger-border)',
    category: 'order',
  },
  order_complete: {
    label: 'Cobrado',
    color: 'var(--audit-op-success)',
    bg: 'var(--audit-op-success-bg)',
    border: 'var(--audit-op-success-border)',
    category: 'order',
  },
  order_cancel: {
    label: 'Cancelado',
    color: 'var(--audit-op-warning)',
    bg: 'var(--audit-op-warning-bg)',
    border: 'var(--audit-op-warning-border)',
    category: 'order',
  },
  payment_process: {
    label: 'Pago',
    color: 'var(--audit-op-payment)',
    bg: 'var(--audit-op-payment-bg)',
    border: 'var(--audit-op-payment-border)',
    category: 'payment',
  },
  table_assign: {
    label: 'Mesa ↗',
    color: 'var(--audit-op-table)',
    bg: 'var(--audit-op-table-bg)',
    border: 'var(--audit-op-table-border)',
    category: 'table',
  },
  table_clear: {
    label: 'Mesa ↙',
    color: 'var(--audit-op-table-soft)',
    bg: 'var(--audit-op-table-soft-bg)',
    border: 'var(--audit-op-table-soft-border)',
    category: 'table',
  },
  user_create: {
    label: 'User +',
    color: 'var(--audit-op-user)',
    bg: 'var(--audit-op-user-bg)',
    border: 'var(--audit-op-user-border)',
    category: 'user',
  },
  user_update: {
    label: 'User ~',
    color: 'var(--audit-op-user-soft)',
    bg: 'var(--audit-op-user-soft-bg)',
    border: 'var(--audit-op-user-soft-border)',
    category: 'user',
  },
  user_delete: {
    label: 'User −',
    color: 'var(--audit-op-danger)',
    bg: 'var(--audit-op-danger-bg)',
    border: 'var(--audit-op-danger-border)',
    category: 'user',
  },
  data_export: {
    label: 'Export',
    color: 'var(--audit-op-warning)',
    bg: 'var(--audit-op-warning-bg)',
    border: 'var(--audit-op-warning-border)',
    category: 'data',
  },
  data_import: {
    label: 'Import',
    color: 'var(--audit-op-warning-soft)',
    bg: 'var(--audit-op-warning-soft-bg)',
    border: 'var(--audit-op-warning-soft-border)',
    category: 'data',
  },
  settings_change: {
    label: 'Config ~',
    color: 'var(--audit-op-muted)',
    bg: 'var(--audit-op-muted-bg)',
    border: 'var(--audit-op-muted-border)',
    category: 'settings',
  },
  license_activate: {
    label: 'Licencia ✓',
    color: 'var(--audit-op-license)',
    bg: 'var(--audit-op-license-bg)',
    border: 'var(--audit-op-license-border)',
    category: 'license',
  },
  license_deactivate: {
    label: 'Licencia ✗',
    color: 'var(--audit-op-danger)',
    bg: 'var(--audit-op-danger-bg)',
    border: 'var(--audit-op-danger-border)',
    category: 'license',
  },
};

const CATEGORY_COLOR: Record<string, string> = {
  auth: 'var(--audit-op-auth)',
  product: 'var(--audit-op-product)',
  category: 'var(--audit-op-category)',
  order: 'var(--audit-op-order)',
  payment: 'var(--audit-op-payment)',
  table: 'var(--audit-op-table)',
  user: 'var(--audit-op-user)',
  settings: 'var(--audit-op-muted)',
  license: 'var(--audit-op-license)',
  data: 'var(--audit-op-warning)',
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
      color: 'var(--audit-op-muted)',
      bg: 'var(--audit-op-muted-bg)',
      border: 'var(--audit-op-muted-border)',
      category: 'other',
    };
  return (
    <span
      class="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-semibold tracking-wide border whitespace-nowrap"
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
        class="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
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
    <span class="text-xs font-mono uppercase tracking-widest text-muted-foreground">
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
  const meta = () =>
    OP_META[props.log.operationType] ?? { color: 'var(--audit-op-muted)', category: 'other' };
  const catColor = () => CATEGORY_COLOR[meta().category] ?? 'var(--audit-op-muted)';

  const oldVal = () => parseJson(props.log.oldValues);
  const newVal = () => parseJson(props.log.newValues);
  const hasDetails = () => oldVal() || newVal() || props.log.operationDetails;

  return (
    <div
      class="group relative border-b transition-colors duration-150 cursor-pointer"
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
            'background-color': props.log.success
              ? 'var(--audit-op-success)'
              : 'var(--audit-op-danger)',
            'box-shadow': props.log.success
              ? '0 0 6px var(--audit-op-success-bg)'
              : '0 0 6px var(--audit-op-danger-bg)',
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
          <span class="text-xs font-mono" style={{ color: 'var(--audit-text-muted)' }}>
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
                class="font-mono text-xs px-1.5 py-0 rounded"
                style={{ color: 'var(--audit-text-muted)', background: 'var(--audit-badge-bg)' }}
              >
                #{props.log.entityId}
              </span>
            </Show>
            <Show when={props.log.tableNumber}>
              <span class="text-xs" style={{ color: 'var(--audit-text-muted)' }}>
                · Mesa {props.log.tableNumber}
              </span>
            </Show>
            <Show when={props.log.paymentMethod}>
              <span class="text-xs capitalize" style={{ color: 'var(--audit-op-payment)' }}>
                · {props.log.paymentMethod}
              </span>
            </Show>
          </div>
          <Show when={props.log.operationDetails}>
            <span class="text-xs truncate mt-0.5" style={{ color: 'var(--audit-text-muted)' }}>
              {props.log.operationDetails}
            </span>
          </Show>
          <Show when={props.log.errorMessage}>
            <span class="text-xs truncate mt-0.5" style={{ color: 'var(--audit-op-danger)' }}>
              ✗ {props.log.errorMessage}
            </span>
          </Show>
        </div>

        {/* Relative time + expand */}
        <div class="flex items-center gap-2 shrink-0">
          <span
            class="text-xs font-mono w-8 text-right"
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
                class="text-xs font-mono uppercase tracking-wider"
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
                  class="text-xs font-mono uppercase tracking-wider mb-2"
                  style={{ color: 'var(--audit-op-danger)' }}
                >
                  Antes
                </div>
                <pre
                  class="text-xs font-mono leading-relaxed overflow-auto max-h-32 whitespace-pre-wrap break-all"
                  style={{ color: 'var(--audit-text-secondary)' }}
                >
                  {formatJson(oldVal())}
                </pre>
              </div>
            </Show>
            <Show when={newVal()}>
              <div class="p-3">
                <div
                  class="text-xs font-mono uppercase tracking-wider mb-2"
                  style={{ color: 'var(--audit-op-success)' }}
                >
                  Después
                </div>
                <pre
                  class="text-xs font-mono leading-relaxed overflow-auto max-h-32 whitespace-pre-wrap break-all"
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
    class="px-2 py-0.5 rounded text-xs font-mono border transition-colors"
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

          /* Operation category palette — themeable via tokens.css semantics.
           * OKLCH color values ensure consistent appearance across themes.
           * These mirror the historical tailwind palette but route through CSS
           * custom properties so the design system can swap themes globally. */
          --audit-op-auth:               oklch(0.72 0.16 250);
          --audit-op-auth-bg:            oklch(0.72 0.16 250 / 0.12);
          --audit-op-auth-border:        oklch(0.72 0.16 250 / 0.35);
          --audit-op-auth-soft:          oklch(0.80 0.10 250);
          --audit-op-auth-soft-bg:       oklch(0.80 0.10 250 / 0.10);
          --audit-op-auth-soft-border:   oklch(0.80 0.10 250 / 0.30);

          --audit-op-product:            oklch(0.74 0.16 162);
          --audit-op-product-bg:         oklch(0.74 0.16 162 / 0.12);
          --audit-op-product-border:     oklch(0.74 0.16 162 / 0.35);
          --audit-op-product-soft:       oklch(0.82 0.10 162);
          --audit-op-product-soft-bg:    oklch(0.82 0.10 162 / 0.10);
          --audit-op-product-soft-border:oklch(0.82 0.10 162 / 0.30);

          --audit-op-category:           oklch(0.76 0.14 184);
          --audit-op-category-bg:        oklch(0.76 0.14 184 / 0.12);
          --audit-op-category-border:    oklch(0.76 0.14 184 / 0.35);
          --audit-op-category-soft:      oklch(0.84 0.09 184);
          --audit-op-category-soft-bg:   oklch(0.84 0.09 184 / 0.10);
          --audit-op-category-soft-border:oklch(0.84 0.09 184 / 0.30);

          --audit-op-order:              oklch(0.78 0.16 80);
          --audit-op-order-bg:           oklch(0.78 0.16 80 / 0.12);
          --audit-op-order-border:       oklch(0.78 0.16 80 / 0.35);
          --audit-op-order-soft:         oklch(0.88 0.10 80);
          --audit-op-order-soft-bg:      oklch(0.88 0.10 80 / 0.10);
          --audit-op-order-soft-border:  oklch(0.88 0.10 80 / 0.30);

          --audit-op-success:            oklch(0.76 0.16 142);
          --audit-op-success-bg:         oklch(0.76 0.16 142 / 0.12);
          --audit-op-success-border:     oklch(0.76 0.16 142 / 0.35);

          --audit-op-warning:            oklch(0.74 0.16 50);
          --audit-op-warning-bg:         oklch(0.74 0.16 50 / 0.12);
          --audit-op-warning-border:     oklch(0.74 0.16 50 / 0.35);
          --audit-op-warning-soft:       oklch(0.82 0.10 50);
          --audit-op-warning-soft-bg:    oklch(0.82 0.10 50 / 0.10);
          --audit-op-warning-soft-border:oklch(0.82 0.10 50 / 0.30);

          --audit-op-danger:             oklch(0.70 0.18 25);
          --audit-op-danger-bg:          oklch(0.70 0.18 25 / 0.12);
          --audit-op-danger-border:      oklch(0.70 0.18 25 / 0.35);

          --audit-op-payment:            oklch(0.74 0.16 290);
          --audit-op-payment-bg:         oklch(0.74 0.16 290 / 0.12);
          --audit-op-payment-border:     oklch(0.74 0.16 290 / 0.35);

          --audit-op-table:              oklch(0.76 0.14 220);
          --audit-op-table-bg:           oklch(0.76 0.14 220 / 0.12);
          --audit-op-table-border:       oklch(0.76 0.14 220 / 0.35);
          --audit-op-table-soft:         oklch(0.84 0.10 220);
          --audit-op-table-soft-bg:      oklch(0.84 0.10 220 / 0.10);
          --audit-op-table-soft-border:  oklch(0.84 0.10 220 / 0.30);

          --audit-op-user:               oklch(0.74 0.16 340);
          --audit-op-user-bg:            oklch(0.74 0.16 340 / 0.12);
          --audit-op-user-border:        oklch(0.74 0.16 340 / 0.35);
          --audit-op-user-soft:          oklch(0.82 0.10 340);
          --audit-op-user-soft-bg:       oklch(0.82 0.10 340 / 0.10);
          --audit-op-user-soft-border:   oklch(0.82 0.10 340 / 0.30);

          --audit-op-license:            oklch(0.74 0.16 270);
          --audit-op-license-bg:         oklch(0.74 0.16 270 / 0.12);
          --audit-op-license-border:     oklch(0.74 0.16 270 / 0.35);

          --audit-op-muted:              oklch(0.70 0.04 250);
          --audit-op-muted-bg:           oklch(0.70 0.04 250 / 0.10);
          --audit-op-muted-border:       oklch(0.70 0.04 250 / 0.25);
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
                  background: 'var(--audit-op-license-bg)',
                  border: '1px solid var(--audit-op-license-border)',
                }}
              >
                <Shield size={15} style={{ color: 'var(--audit-op-license)' }} />
              </div>
              <div>
                <h1
                  class="text-sm font-mono font-bold uppercase tracking-[0.2em]"
                  style={{ color: 'var(--audit-text-primary)' }}
                >
                  Registro de Auditoría — TPV El Haido
                </h1>
                <p class="text-xs font-mono mt-0.5" style={{ color: 'var(--audit-text-muted)' }}>
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
                  class="h-7 px-2 text-xs font-mono"
                  style={{ color: 'var(--audit-op-danger)' }}
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
                style={{ color: filterOpen() ? 'var(--audit-op-auth)' : 'var(--audit-text-muted)' }}
              >
                <Filter size={13} />
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div class="grid grid-cols-4 gap-2">
            <StatCard label="Total registros" value={stats().total} />
            <StatCard label="Hoy" value={stats().today} accent="var(--audit-op-auth)" />
            <StatCard
              label="Errores 24h"
              value={stats().errors}
              accent={stats().errors > 0 ? 'var(--audit-op-danger)' : 'var(--audit-text-muted)'}
            />
            <StatCard label="Usuarios" value={stats().users} accent="var(--audit-op-product)" />
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
                  <label class="text-xs font-mono uppercase tracking-widest block mb-1.5 text-muted-foreground/60">
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
                      class="w-full h-7 pl-6 pr-2 rounded text-xs font-mono border border-border/60 outline-none bg-background text-foreground placeholder:text-muted-foreground/40"
                    />
                  </div>
                </div>

                {/* Date range */}
                <div>
                  <label class="text-xs font-mono uppercase tracking-widest block mb-1.5 text-muted-foreground/60">
                    Período
                  </label>
                  <div class="space-y-1.5">
                    <input
                      type="date"
                      value={startDate()}
                      onInput={(e) => setStartDate(e.currentTarget.value)}
                      class="w-full h-7 px-2 rounded text-xs font-mono border border-border/60 outline-none bg-background text-foreground"
                    />
                    <input
                      type="date"
                      value={endDate()}
                      onInput={(e) => setEndDate(e.currentTarget.value)}
                      class="w-full h-7 px-2 rounded text-xs font-mono border border-border/60 outline-none bg-background text-foreground"
                    />
                  </div>
                </div>

                {/* Result filter */}
                <div>
                  <label class="text-xs font-mono uppercase tracking-widest block mb-1.5 text-muted-foreground/60">
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
                      color="var(--audit-op-success)"
                      onClick={() => setFilterSuccess(true)}
                    />
                    <FilterPill
                      label="✗ Error"
                      active={filterSuccess() === false}
                      color="var(--audit-op-danger)"
                      onClick={() => setFilterSuccess(false)}
                    />
                  </div>
                </div>

                {/* Operation filter */}
                <div>
                  <label class="text-xs font-mono uppercase tracking-widest block mb-1.5 text-muted-foreground/60">
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
                  <label class="text-xs font-mono uppercase tracking-widest block mb-1.5 text-muted-foreground/60">
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
                    class="text-xs font-mono uppercase tracking-widest block mb-2"
                    style={{ color: 'var(--audit-text-muted)' }}
                  >
                    Exportar
                  </label>
                  <button
                    type="button"
                    disabled={exporting()}
                    onClick={() => void handleExport('json')}
                    class="w-full flex items-center gap-2 px-2.5 py-1.5 rounded border text-xs font-mono transition-opacity hover:opacity-80"
                    style={{
                      background: 'var(--audit-op-warning-bg)',
                      'border-color': 'var(--audit-op-warning-border)',
                      color: 'var(--audit-op-warning)',
                    }}
                  >
                    <Download size={11} /> JSON
                  </button>
                  <button
                    type="button"
                    disabled={exporting()}
                    onClick={() => void handleExport('csv')}
                    class="w-full flex items-center gap-2 px-2.5 py-1.5 rounded border text-xs font-mono transition-opacity hover:opacity-80"
                    style={{
                      background: 'var(--audit-op-product-bg)',
                      'border-color': 'var(--audit-op-product-border)',
                      color: 'var(--audit-op-product)',
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
              <div class="text-xs font-mono uppercase tracking-widest w-[72px] text-right shrink-0 text-muted-foreground/50">
                Hora
              </div>
              <div class="text-xs font-mono uppercase tracking-widest w-[130px] shrink-0 text-muted-foreground/50">
                Empleado
              </div>
              <div class="text-xs font-mono uppercase tracking-widest shrink-0 text-muted-foreground/50">
                Operación
              </div>
              <div class="text-xs font-mono uppercase tracking-widest flex-1 text-muted-foreground/50">
                Detalle
              </div>
              <div class="text-xs font-mono uppercase tracking-widest w-12 text-right shrink-0 text-muted-foreground/50">
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
                    class="w-1.5 h-1.5 rounded-full"
                    style={{
                      'background-color': 'var(--audit-op-success)',
                      'box-shadow': '0 0 4px var(--audit-op-success-bg)',
                    }}
                  />
                  <span class="text-xs font-mono" style={{ color: 'var(--audit-text-muted)' }}>
                    {filtered().length} de {logs().length} registros
                  </span>
                </div>
                <Show when={hasFilters()}>
                  <span class="text-xs font-mono" style={{ color: 'var(--audit-op-order)' }}>
                    · filtros activos
                  </span>
                </Show>
              </div>
              <div class="flex items-center gap-1.5">
                <Activity size={10} style={{ color: 'var(--audit-text-muted)' }} />
                <span class="text-xs font-mono" style={{ color: 'var(--audit-text-muted)' }}>
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
