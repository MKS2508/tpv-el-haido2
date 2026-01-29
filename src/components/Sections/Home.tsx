import { Motion } from '@motionone/solid';
import {
  AwardIcon,
  CalendarIcon,
  DollarSignIcon,
  ShoppingCartIcon,
  TrendingUpIcon,
  Activity,
} from 'lucide-solid';
import { type Component, createMemo, createSignal, For, Show } from 'solid-js';
import { Chart as ChartJS, ArcElement, CategoryScale, Filler, Legend, LinearScale, LineController, LineElement, PointElement, PieController, Title, Tooltip } from 'chart.js';
import { Line, Pie } from '@amad3v/solid-chart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useResponsive } from '@/hooks/useResponsive';
import { cn } from '@/lib/utils';
import type Order from '@/models/Order';
import { homeData } from '@/store/selectors';

ChartJS.register(
  LineController,
  PieController,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Filler,
  Title,
  Tooltip,
  Legend
);

const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

interface HomeHeaderProps {
  userName: string;
  dateRange: { from: Date; to: Date };
  handleDateRangeChange: (values: {
    range: { from: Date; to: Date | undefined };
    rangeCompare?: { from: Date; to: Date | undefined } | undefined;
  }) => void;
  isMobile: boolean;
}

const HomeHeader: Component<HomeHeaderProps> = (props) => (
  <Motion.div
    class={cn(
      'flex-none bg-background/80 backdrop-blur-md border-b border-border',
      props.isMobile ? 'p-4 pb-3' : 'p-6 pb-4'
    )}
    initial={{ opacity: 0, y: -20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6, easing: [0.4, 0, 0.2, 1] }}
  >
    <div class={cn('flex items-center justify-between', props.isMobile ? 'flex-col gap-4' : '')}>
      <div class={props.isMobile ? 'text-center' : ''}>
        <h2
          class={cn(
            'font-black tracking-tight',
            'bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent',
            'bg-[length:300%_100%]',
            'animate-gradient',
            props.isMobile ? 'text-2xl' : 'text-4xl'
          )}
        >
          ¡Hola {props.userName}!
        </h2>
        <p class={cn('text-muted-foreground mt-1.5', props.isMobile ? 'text-sm' : 'text-base')}>
          Bienvenido de nuevo al TPV de El Haido
        </p>
      </div>

      <Show when={!props.isMobile}>
        <div class="flex items-center gap-2 px-4 py-2 rounded-xl border border-border/50 bg-muted/50 text-sm text-muted-foreground">
          <CalendarIcon class="h-4 w-4" />
          <span>
            {props.dateRange.from.toLocaleDateString('es-ES')} -{' '}
            {props.dateRange.to.toLocaleDateString('es-ES')}
          </span>
        </div>
      </Show>
    </div>
  </Motion.div>
);

interface StatCardProps {
  title: string;
  value: string | number;
  numericValue?: number;
  suffix?: string;
  prefix?: string;
  isAnimated?: boolean;
  Icon: Component<{ class?: string }>;
  variant?: 'success' | 'primary' | 'accent' | 'warning';
  index?: number;
  trend?: 'up' | 'down' | 'neutral';
}

const cardVariants = {
  success: {
    container: 'group-hover:border-success/40',
    iconBg: 'bg-success/10 group-hover:bg-success/20',
    iconText: 'text-success group-hover:text-success',
    trendBg: 'bg-success/5 text-success/80',
    glow: 'group-hover:shadow-success/20',
  },
  primary: {
    container: 'group-hover:border-primary/40',
    iconBg: 'bg-primary/10 group-hover:bg-primary/20',
    iconText: 'text-primary group-hover:text-primary',
    trendBg: 'bg-primary/5 text-primary/80',
    glow: 'group-hover:shadow-primary/20',
  },
  accent: {
    container: 'group-hover:border-accent/40',
    iconBg: 'bg-accent/10 group-hover:bg-accent/20',
    iconText: 'text-accent group-hover:text-accent',
    trendBg: 'bg-accent/5 text-accent/80',
    glow: 'group-hover:shadow-accent/20',
  },
  warning: {
    container: 'group-hover:border-warning/40',
    iconBg: 'bg-warning/10 group-hover:bg-warning/20',
    iconText: 'text-warning group-hover:text-warning',
    trendBg: 'bg-warning/5 text-warning/80',
    glow: 'group-hover:shadow-warning/20',
  },
};

const StatCard: Component<StatCardProps> = (props) => {
  const variantStyles = () => cardVariants[props.variant ?? 'primary'];
  const responsive = useResponsive();
  const index = () => props.index ?? 0;

  const formattedValue = createMemo(() => {
    if (props.isAnimated && props.numericValue !== undefined) {
      const formatted =
        props.suffix === '€' ? props.numericValue.toFixed(2) : props.numericValue.toString();
      return `${props.prefix ?? ''}${formatted}${props.suffix ?? ''}`;
    }
    return props.value;
  });

  return (
    <Motion.div
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.5,
        delay: index() * 0.08,
        easing: [0.4, 0, 0.2, 1],
      }}
    >
      <div
        class={cn(
          'group relative bg-card rounded-2xl border-2 border-border transition-all duration-500',
          variantStyles().container,
          'hover:shadow-lg',
          variantStyles().glow,
          responsive.isMobile() && 'hover:shadow-md'
        )}
      >
        <div class={cn('p-5', responsive.isMobile() && 'p-4')}>
          <div class="flex items-start justify-between gap-3">
            <div class="flex-1 min-w-0">
              <p class={cn('text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1', responsive.isMobile() && 'text-[10px]')}>
                {props.title}
              </p>
              <Motion.div
                class={cn(
                  'font-black tracking-tight',
                  responsive.isMobile() ? 'text-2xl' : 'text-3xl'
                )}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  duration: 0.6,
                  delay: index() * 0.08 + 0.15,
                  easing: [0.34, 1.56, 0.64, 1],
                }}
                style={{ 'font-variant-numeric': 'tabular-nums' }}
              >
                {formattedValue()}
              </Motion.div>
            </div>

            <div
              class={cn(
                'flex-shrink-0 p-2.5 rounded-xl transition-all duration-300',
                variantStyles().iconBg,
                'group-hover:scale-105 group-hover:rotate-5'
              )}
            >
              <props.Icon
                class={cn(variantStyles().iconText, responsive.isMobile() ? 'h-4 w-4' : 'h-5 w-5')}
              />
            </div>
          </div>

          <div class="mt-3 flex items-center gap-1.5">
            <div class={cn('h-1 flex-1 rounded-full bg-muted overflow-hidden', variantStyles().iconBg.replace('/10', '/5'))}>
              <Motion.div
                class={cn('h-full rounded-full', variantStyles().iconBg.replace('/10', ''))}
                initial={{ width: '0%' }}
                animate={{ width: '75%' }}
                transition={{ duration: 1, delay: index() * 0.08 + 0.4 }}
              />
            </div>
            <span class={cn('text-xs font-semibold', variantStyles().iconText)}>75%</span>
          </div>
        </div>
      </div>
    </Motion.div>
  );
};

interface StatsGridProps {
  stats: {
    totalSales: number;
    totalOrders: number;
    averageOrderValue: number;
    bestSellerProduct: { name: string; timesOrdered: number };
  };
  isMobile: boolean;
}

const StatsGrid: Component<StatsGridProps> = (props) => (
  <div
    class={cn(
      'grid gap-4',
      props.isMobile ? 'grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
    )}
  >
    <StatCard
      title="Ventas Totales"
      value={`${props.stats.totalSales.toFixed(2)}€`}
      numericValue={props.stats.totalSales}
      suffix="€"
      isAnimated={true}
      Icon={DollarSignIcon}
      variant="success"
      index={0}
    />
    <StatCard
      title="Pedidos"
      value={props.stats.totalOrders.toString()}
      numericValue={props.stats.totalOrders}
      isAnimated={true}
      Icon={ShoppingCartIcon}
      variant="primary"
      index={1}
    />
    <StatCard
      title="Ticket Promedio"
      value={`${props.stats.averageOrderValue.toFixed(2)}€`}
      numericValue={props.stats.averageOrderValue}
      suffix="€"
      isAnimated={true}
      Icon={TrendingUpIcon}
      variant="accent"
      index={2}
    />
    <StatCard
      title="Más Vendido"
      value={props.stats.bestSellerProduct.name}
      Icon={AwardIcon}
      variant="warning"
      index={3}
    />
  </div>
);

interface LineChartCardProps {
  title: string;
  data: { date: string; sales: number }[];
  index?: number;
}

const LineChartCard: Component<LineChartCardProps> = (props) => {
  const responsive = useResponsive();
  const index = () => props.index ?? 0;

  const chartData = createMemo(() => {
    const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#8b5cf6';
    const primaryRgb = primaryColor.match(/\d+/g);
    const primaryRgba = primaryRgb ? `rgba(${primaryRgb[0]}, ${primaryRgb[1]}, ${primaryRgb[2]},` : 'rgba(139, 92, 246,';

    return {
      labels: props.data.map((d) => d.date),
      datasets: [
        {
          label: 'Ventas',
          data: props.data.map((d) => d.sales),
          borderColor: 'hsl(var(--primary))',
          backgroundColor: (context: any) => {
            const ctx = context.chart.ctx;
            const gradient = ctx.createLinearGradient(0, 0, 0, 300);
            gradient.addColorStop(0, `${primaryRgba} 0.4)`);
            gradient.addColorStop(1, `${primaryRgba} 0)`);
            return gradient;
          },
          tension: 0.4,
          fill: true,
          pointBackgroundColor: 'hsl(var(--primary))',
          pointBorderColor: 'hsl(var(--background))',
          pointBorderWidth: 2,
          pointRadius: responsive.isMobile() ? 3 : 4,
          pointHoverRadius: 6,
        },
      ],
    };
  });

  const chartOptions = createMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'hsl(var(--card))',
        titleColor: 'hsl(var(--card-foreground))',
        bodyColor: 'hsl(var(--card-foreground))',
        borderColor: 'hsl(var(--border))',
        borderWidth: 1,
        padding: 12,
        displayColors: false,
        callbacks: {
          label: (context: { raw: number }) => `${context.raw.toFixed(2)}€`,
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: 'hsl(var(--border) / 0.5)',
          drawBorder: false,
        },
        ticks: {
          color: 'hsl(var(--muted-foreground))',
          maxTicksLimit: responsive.isMobile() ? 4 : 8,
          font: { size: 11 },
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'hsl(var(--border) / 0.5)',
          drawBorder: false,
        },
        ticks: {
          color: 'hsl(var(--muted-foreground))',
          callback: (value: number) => `${value}€`,
          font: { size: 11 },
        },
      },
    },
  }));

  return (
    <Motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.6,
        delay: 0.3 + index() * 0.08,
        easing: [0.4, 0, 0.2, 1],
      }}
    >
      <Card
        class={cn(
          'bg-card/50 backdrop-blur-sm border-2 border-border transition-all duration-500',
          'hover:shadow-lg hover:border-primary/20',
          responsive.isMobile() && 'hover:shadow-md'
        )}
      >
        <CardHeader class={cn(responsive.isMobile() ? 'pb-3 px-4 pt-4' : 'pb-4 px-6 pt-5')}>
          <div class="flex items-center gap-3">
            <div class={cn('p-2 rounded-xl bg-primary/10', responsive.isMobile() ? 'p-1.5' : 'p-2')}>
              <TrendingUpIcon
                class={cn('text-primary', responsive.isMobile() ? 'h-4 w-4' : 'h-5 w-5')}
              />
            </div>
            <CardTitle
              class={cn(
                'font-semibold text-card-foreground',
                responsive.isMobile() ? 'text-sm' : 'text-lg'
              )}
            >
              {props.title}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent class={cn(responsive.isMobile() ? 'px-4 pb-4' : 'px-6 pb-5')}>
          <div
            class={cn(
              'rounded-xl border border-border/50 bg-muted/30',
              responsive.isMobile() ? 'h-[220px]' : 'h-[300px]'
            )}
          >
            <Show when={props.data.length > 0} fallback={
              <div class="flex items-center justify-center h-full text-center text-muted-foreground p-4">
                <Activity class="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p class="font-medium">Sin datos de ventas</p>
                <p class="text-sm mt-1">Añade pedidos para ver el gráfico</p>
              </div>
            }>
              <Line data={chartData()} options={chartOptions()} />
            </Show>
          </div>
        </CardContent>
      </Card>
    </Motion.div>
  );
};

interface PieChartCardProps {
  title: string;
  data: { name: string; value: number }[];
  index?: number;
}

const PieChartCard: Component<PieChartCardProps> = (props) => {
  const responsive = useResponsive();
  const index = () => props.index ?? 0;

  const chartData = createMemo(() => ({
    labels: props.data.map((d) => d.name),
    datasets: [
      {
        data: props.data.map((d) => d.value),
        backgroundColor: CHART_COLORS.slice(0, props.data.length),
        borderColor: 'hsl(var(--card))',
        borderWidth: 2,
        hoverOffset: 8,
      },
    ],
  }));

  const chartOptions = createMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: !responsive.isMobile(),
        position: 'right' as const,
        labels: {
          color: 'hsl(var(--card-foreground))',
          boxWidth: 12,
          padding: 12,
          font: { size: 11 },
          usePointStyle: true,
          pointStyle: 'circle',
        },
      },
      tooltip: {
        backgroundColor: 'hsl(var(--card))',
        titleColor: 'hsl(var(--card-foreground))',
        bodyColor: 'hsl(var(--card-foreground))',
        borderColor: 'hsl(var(--border))',
        borderWidth: 1,
        padding: 12,
        callbacks: {
          label: (context: { label: string; raw: number }) => `${context.label}: ${context.raw}`,
        },
      },
    },
  }));

  return (
    <Motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        duration: 0.6,
        delay: 0.4 + index() * 0.08,
        easing: [0.4, 0, 0.2, 1],
      }}
    >
      <Card
        class={cn(
          'bg-card/50 backdrop-blur-sm border-2 border-border transition-all duration-500',
          'hover:shadow-lg hover:border-accent/20',
          responsive.isMobile() && 'hover:shadow-md'
        )}
      >
        <CardHeader class={cn(responsive.isMobile() ? 'pb-3 px-4 pt-4' : 'pb-4 px-6 pt-5')}>
          <CardTitle
            class={cn(
              'font-semibold text-card-foreground flex items-center gap-3',
              responsive.isMobile() ? 'text-sm' : 'text-lg'
            )}
          >
            <div class={cn('p-2 rounded-xl bg-accent/10', responsive.isMobile() ? 'p-1.5' : 'p-2')}>
              <DollarSignIcon
                class={cn('text-accent', responsive.isMobile() ? 'h-4 w-4' : 'h-5 w-5')}
              />
            </div>
            {props.title}
          </CardTitle>
        </CardHeader>
        <CardContent class={cn(responsive.isMobile() ? 'px-4 pb-4' : 'px-6 pb-5')}>
          <div
            class={cn(
              'rounded-xl border border-border/50 bg-muted/30',
              responsive.isMobile() ? 'h-[220px]' : 'h-[300px]'
            )}
          >
            <Show when={props.data.length > 0} fallback={
              <div class="flex items-center justify-center h-full text-center text-muted-foreground p-4">
                <Activity class="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p class="font-medium">Sin datos</p>
                <p class="text-sm mt-1">No hay información disponible</p>
              </div>
            }>
              <Pie data={chartData()} options={chartOptions()} />
            </Show>
          </div>
        </CardContent>
      </Card>
    </Motion.div>
  );
};

interface RecentOrdersTableProps {
  orders: Order[];
  index?: number;
}

const RecentOrdersTable: Component<RecentOrdersTableProps> = (props) => {
  const index = () => props.index ?? 0;
  const responsive = useResponsive();
  const displayOrders = createMemo(() => props.orders.slice(0, 5));

  return (
    <Motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.6,
        delay: 0.5 + index() * 0.08,
        easing: [0.4, 0, 0.2, 1],
      }}
    >
      <Card
        class={cn(
          'bg-card/50 backdrop-blur-sm border-2 border-border transition-all duration-500',
          'hover:shadow-lg hover:border-accent/20'
        )}
      >
        <CardHeader class={cn('pb-4', responsive.isMobile() ? 'px-4 pt-4' : 'px-6 pt-5')}>
          <div class="flex items-center gap-3">
            <div class="p-2 rounded-xl bg-accent/10">
              <ShoppingCartIcon class="h-5 w-5 text-accent" />
            </div>
            <CardTitle class="text-lg font-semibold text-card-foreground">
              Pedidos Recientes
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent class={cn(responsive.isMobile() ? 'px-4 pb-4' : 'px-6 pb-5')}>
          <Table>
            <TableHeader>
              <TableRow class="border-b border-border">
                <TableHead class="text-muted-foreground font-semibold text-xs uppercase tracking-wider">ID</TableHead>
                <TableHead class="text-muted-foreground font-semibold text-xs uppercase tracking-wider">Fecha</TableHead>
                <TableHead class="text-muted-foreground font-semibold text-xs uppercase tracking-wider">Total</TableHead>
                <TableHead class="text-muted-foreground font-semibold text-xs uppercase tracking-wider">Ubicacion</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <For each={displayOrders()}>
                {(order, orderIndex) => (
                  <Motion.tr
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      duration: 0.3,
                      delay: 0.6 + orderIndex() * 0.06,
                    }}
                    class="border-b border-border/50 hover:bg-muted/30 transition-colors"
                  >
                    <TableCell class="font-medium text-card-foreground">#{order.id}</TableCell>
                    <TableCell class="text-muted-foreground">{new Date(order.date).toLocaleDateString('es-ES')}</TableCell>
                    <TableCell class="font-bold text-success">
                      {order.total.toFixed(2)}€
                    </TableCell>
                    <TableCell>
                      <span class="inline-flex items-center px-2.5 py-1 bg-primary/10 text-primary text-xs rounded-full font-medium border border-primary/20">
                        {order.tableNumber ? `Mesa ${order.tableNumber}` : 'Barra'}
                      </span>
                    </TableCell>
                  </Motion.tr>
                )}
              </For>
              <Show when={displayOrders().length === 0}>
                <tr>
                  <TableCell colSpan={4} class="text-center text-muted-foreground py-8">
                    No hay pedidos recientes
                  </TableCell>
                </tr>
              </Show>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Motion.div>
  );
};

interface TopProductsCardProps {
  products: { name: string; timesOrdered: number }[];
  index?: number;
}

const TopProductsCard: Component<TopProductsCardProps> = (props) => {
  const index = () => props.index ?? 0;
  const responsive = useResponsive();

  const rankColors = [
    'bg-warning text-warning-foreground',
    'bg-muted text-muted-foreground',
    'bg-primary/20 text-primary',
    'bg-accent/20 text-accent',
    'bg-success/20 text-success',
  ];

  return (
    <Motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.6,
        delay: 0.6 + index() * 0.08,
        easing: [0.4, 0, 0.2, 1],
      }}
    >
      <Card
        class={cn(
          'bg-card/50 backdrop-blur-sm border-2 border-border transition-all duration-500',
          'hover:shadow-lg hover:border-warning/20'
        )}
      >
        <CardHeader class={cn('pb-4', responsive.isMobile() ? 'px-4 pt-4' : 'px-6 pt-5')}>
          <div class="flex items-center gap-3">
            <div class="p-2 rounded-xl bg-warning/10">
              <AwardIcon class="h-5 w-5 text-warning" />
            </div>
            <CardTitle class="text-lg font-semibold text-card-foreground">
              Top 5 Productos
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent class={cn(responsive.isMobile() ? 'px-4 pb-4' : 'px-6 pb-5')}>
          <ul class="space-y-2">
            <For each={props.products}>
              {(product, productIndex) => (
                <Motion.li
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    duration: 0.3,
                    delay: 0.7 + productIndex() * 0.06,
                  }}
                  class="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors group"
                >
                  <div
                    class={cn(
                      'flex items-center justify-center w-7 h-7 rounded-lg text-sm font-bold transition-transform group-hover:scale-110',
                      rankColors[productIndex()]
                    )}
                  >
                    {productIndex() + 1}
                  </div>
                  <div class="flex-1 min-w-0">
                    <span class="font-medium text-card-foreground">{product.name}</span>
                  </div>
                  <span class="inline-flex items-center px-2.5 py-1 bg-success/10 text-success text-xs rounded-full font-semibold border border-success/20 whitespace-nowrap">
                    {product.timesOrdered}
                  </span>
                </Motion.li>
              )}
            </For>
            <Show when={props.products.length === 0}>
              <li class="text-center text-muted-foreground py-8">
                No hay datos de productos
              </li>
            </Show>
          </ul>
        </CardContent>
      </Card>
    </Motion.div>
  );
};

const getTotalSales = (orderHistory: Order[]) => {
  return orderHistory.reduce((total, order) => total + order.total, 0);
};

const getTotalOrders = (orderHistory: Order[]) => {
  return orderHistory.filter((order) => order.items.length > 0).length;
};

const getAverageOrderValue = (orderHistory: Order[]) => {
  if (orderHistory.length === 0) return 0;
  return getTotalSales(orderHistory) / orderHistory.length;
};

const getBestSellerProduct = (
  orderHistory: Order[]
): { name: string; timesOrdered: number } | null => {
  const timesOrdered: { name: string; timesOrdered: number }[] = [];
  orderHistory.forEach((order) => {
    order.items.forEach((item) => {
      const product = item.name;
      const quantity = item.quantity;
      const existingProduct = timesOrdered.find((p) => p.name === product);
      if (existingProduct) {
        existingProduct.timesOrdered += quantity;
      } else {
        timesOrdered.push({ name: product, timesOrdered: quantity });
      }
    });
  });

  return timesOrdered.sort((a, b) => b.timesOrdered - a.timesOrdered)[0] || null;
};

const getSalesByCategory = (orderHistory: Order[]) => {
  const salesByCategory: { name: string; value: number }[] = [];
  orderHistory.forEach((order) => {
    order.items.forEach((item) => {
      const product = item.category;
      const quantity = 1;
      const existingProduct = salesByCategory.find((p) => p.name === product);
      if (existingProduct) {
        existingProduct.value += quantity;
      } else {
        salesByCategory.push({ name: product, value: quantity });
      }
    });
  });
  return salesByCategory.sort((a, b) => b.value - a.value);
};

const getOrdersByLocation = (orderHistory: Order[]) => {
  const ordersByLocation: { name: string; value: number }[] = [];
  orderHistory.forEach((order) => {
    const isTable = order.tableNumber !== 0;
    const location = isTable ? `Mesa ${order.tableNumber}` : 'Barra';
    const existingLocation = ordersByLocation.find((p) => p.name === location);
    if (existingLocation) {
      existingLocation.value += 1;
    } else {
      ordersByLocation.push({ name: location, value: 1 });
    }
  });
  return ordersByLocation.sort((a, b) => b.value - a.value);
};

const getTop5Products = (orderHistory: Order[]): { name: string; timesOrdered: number }[] => {
  const timesOrdered: { name: string; timesOrdered: number }[] = [];
  orderHistory.forEach((order) => {
    order.items.forEach((item) => {
      const product = item.name;
      const quantity = item.quantity;
      const existingProduct = timesOrdered.find((p) => p.name === product);
      if (existingProduct) {
        existingProduct.timesOrdered += quantity;
      } else {
        timesOrdered.push({ name: product, timesOrdered: quantity });
      }
    });
  });
  return timesOrdered.sort((a, b) => b.timesOrdered - a.timesOrdered).slice(0, 5);
};

const getSalesTrend = (orderHistory: Order[]): { date: string; sales: number }[] => {
  const salesByDate: { [key: string]: number } = {};
  orderHistory.forEach((order) => {
    const date = new Date(order.date).toISOString().split('T')[0];
    if (salesByDate[date]) {
      salesByDate[date] += order.total;
    } else {
      salesByDate[date] = order.total;
    }
  });
  return Object.entries(salesByDate).map(([date, sales]) => ({ date, sales }));
};

interface HomeProps {
  userName: string;
}

const Home: Component<HomeProps> = (props) => {
  const data = homeData();
  const responsive = useResponsive();

  const [dateRange, setDateRange] = createSignal({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    to: new Date(),
  });

  const filteredOrders = createMemo(() => {
    const range = dateRange();
    return data.orderHistory.filter((order) => {
      const orderDate = new Date(order.date);
      return orderDate >= range.from && orderDate <= range.to;
    });
  });

  const stats = createMemo(() => ({
    totalSales: getTotalSales(filteredOrders()),
    totalOrders: getTotalOrders(filteredOrders()),
    averageOrderValue: getAverageOrderValue(filteredOrders()),
    bestSellerProduct: getBestSellerProduct(filteredOrders()) || {
      name: 'Sin productos',
      timesOrdered: 0,
    },
  }));

  const chartData = createMemo(() => ({
    salesByCategory: getSalesByCategory(filteredOrders()),
    ordersByLocation: getOrdersByLocation(filteredOrders()),
    top5Products: getTop5Products(filteredOrders()),
    salesTrend: getSalesTrend(filteredOrders()),
  }));

  const handleDateRangeChange = (values: {
    range: { from: Date; to: Date | undefined };
    rangeCompare?: { from: Date; to: Date | undefined } | undefined;
  }) => {
    const { from, to } = values.range;
    if (!from || !to) return;
    setDateRange({ from, to });
  };

  return (
    <div class="flex flex-col h-full overflow-hidden bg-background">
      <HomeHeader
        userName={props.userName}
        dateRange={dateRange()}
        handleDateRangeChange={handleDateRangeChange}
        isMobile={responsive.isMobile()}
      />

      <div
        class={cn(
          'flex-grow overflow-y-auto',
          responsive.isMobile() ? 'p-4 space-y-4' : 'p-6 space-y-6'
        )}
      >
        <StatsGrid stats={stats()} isMobile={responsive.isMobile()} />

        <div
          class={cn(
            'grid gap-4',
            responsive.isMobile()
              ? 'grid-cols-1'
              : 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4'
          )}
        >
          <div class={cn(responsive.isMobile() ? '' : 'lg:col-span-2 xl:col-span-2 2xl:col-span-2')}>
            <LineChartCard title="Tendencia de Ventas" data={chartData().salesTrend} index={0} />
          </div>

          <div class={cn(responsive.isMobile() ? '' : 'lg:col-span-1 xl:col-span-1 2xl:col-span-1')}>
            <PieChartCard
              title="Ventas por Categoría"
              data={chartData().salesByCategory}
              index={0}
            />
          </div>

          <div class={cn(responsive.isMobile() ? '' : 'lg:col-span-1 xl:col-span-1 2xl:col-span-1')}>
            <PieChartCard
              title="Pedidos por Ubicación"
              data={chartData().ordersByLocation}
              index={1}
            />
          </div>
        </div>

        <div
          class={cn(
            'grid gap-4',
            responsive.isMobile() ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'
          )}
        >
          <RecentOrdersTable orders={filteredOrders()} index={0} />
          <TopProductsCard products={chartData().top5Products} index={1} />
        </div>
      </div>
    </div>
  );
};

export default Home;
