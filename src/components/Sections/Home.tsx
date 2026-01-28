import { Motion, Presence } from '@motionone/solid';
import { AwardIcon, DollarSignIcon, ShoppingCartIcon, TrendingUpIcon } from 'lucide-solid';
import { createMemo, createSignal, For, Show, type Component, type JSX } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
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

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

// Header Component
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
      'flex-none bg-background border-b border-border/50',
      props.isMobile ? 'p-4 pb-3' : 'p-6'
    )}
    initial={{ opacity: 0, y: -20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6, easing: [0.4, 0, 0.2, 1] }}
  >
    <div class={cn('flex items-center', props.isMobile ? 'flex-col gap-3' : 'justify-between')}>
      <div class={props.isMobile ? 'text-center' : ''}>
        <h2
          class={cn(
            'font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent',
            props.isMobile ? 'text-xl' : 'text-3xl'
          )}
        >
          ¡Hola {props.userName}!
        </h2>
        <p class={cn('text-muted-foreground mt-1', props.isMobile ? 'text-sm' : 'text-lg')}>
          Bienvenido de nuevo al TPV de El Haido.
        </p>
      </div>

      <Show when={!props.isMobile}>
        <DateRangePicker
          initialDateFrom={props.dateRange.from}
          initialDateTo={props.dateRange.to}
          onUpdate={props.handleDateRangeChange}
        />
      </Show>
    </div>
  </Motion.div>
);

// Stats Card Component
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
}

const cardVariants = {
  success: {
    cardClass:
      'bg-gradient-to-br from-success/5 to-success/10 border-success/20 shadow-success/5 hover:shadow-success/10',
    iconClass: 'h-5 w-5 text-success',
    iconBg: 'bg-success/10',
  },
  primary: {
    cardClass:
      'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 shadow-primary/5 hover:shadow-primary/10',
    iconClass: 'h-5 w-5 text-primary',
    iconBg: 'bg-primary/10',
  },
  accent: {
    cardClass:
      'bg-gradient-to-br from-accent/5 to-accent/10 border-accent/20 shadow-accent/5 hover:shadow-accent/10',
    iconClass: 'h-5 w-5 text-accent',
    iconBg: 'bg-accent/10',
  },
  warning: {
    cardClass:
      'bg-gradient-to-br from-warning/5 to-warning/10 border-warning/20 shadow-warning/5 hover:shadow-warning/10',
    iconClass: 'h-5 w-5 text-warning',
    iconBg: 'bg-warning/10',
  },
};

const StatCard: Component<StatCardProps> = (props) => {
  const variantStyles = () => cardVariants[props.variant ?? 'primary'];
  const responsive = useResponsive();
  const index = () => props.index ?? 0;

  // Format number for display
  const formattedValue = createMemo(() => {
    if (props.isAnimated && props.numericValue !== undefined) {
      const formatted = props.suffix === '€'
        ? props.numericValue.toFixed(2)
        : props.numericValue.toString();
      return `${props.prefix ?? ''}${formatted}${props.suffix ?? ''}`;
    }
    return props.value;
  });

  return (
    <Motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.5,
        delay: index() * 0.1,
        easing: [0.4, 0, 0.2, 1],
      }}
      hover={{ y: -4 }}
    >
      <Card
        class={cn(
          `${variantStyles().cardClass} shadow-lg transition-all duration-300 hover:shadow-xl border-2`,
          responsive.isMobile && 'shadow-md hover:shadow-lg'
        )}
      >
        <CardHeader
          class={cn(
            'flex flex-row items-center justify-between space-y-0',
            responsive.isMobile ? 'pb-1 px-3 pt-3' : 'pb-3'
          )}
        >
          <CardTitle
            class={cn(
              'font-semibold text-card-foreground',
              responsive.isMobile ? 'text-xs leading-tight' : 'text-sm'
            )}
          >
            {props.title}
          </CardTitle>
          <div
            class={cn(
              `${variantStyles().iconBg} rounded-lg transition-transform duration-200 hover:scale-110`,
              responsive.isMobile ? 'p-1.5' : 'p-2'
            )}
          >
            <Dynamic
              component={props.Icon}
              class={cn(variantStyles().iconClass, responsive.isMobile ? 'h-4 w-4' : 'h-5 w-5')}
            />
          </div>
        </CardHeader>
        <CardContent class={cn('pt-0', responsive.isMobile ? 'px-3 pb-3' : '')}>
          <Motion.div
            class={cn('font-bold text-card-foreground', responsive.isMobile ? 'text-lg' : 'text-3xl')}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{
              duration: 0.6,
              delay: index() * 0.1 + 0.2,
            }}
            style={{ 'font-variant-numeric': 'tabular-nums' }}
          >
            {formattedValue()}
          </Motion.div>
        </CardContent>
      </Card>
    </Motion.div>
  );
};

// Stats Grid Component
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
      title="Pedidos Totales"
      value={props.stats.totalOrders.toString()}
      numericValue={props.stats.totalOrders}
      isAnimated={true}
      Icon={ShoppingCartIcon}
      variant="primary"
      index={1}
    />
    <StatCard
      title="Valor Promedio de Pedido"
      value={`${props.stats.averageOrderValue.toFixed(2)}€`}
      numericValue={props.stats.averageOrderValue}
      suffix="€"
      isAnimated={true}
      Icon={TrendingUpIcon}
      variant="accent"
      index={2}
    />
    <StatCard
      title="Best Seller"
      value={props.stats.bestSellerProduct.name}
      Icon={AwardIcon}
      variant="warning"
      index={3}
    />
  </div>
);

// LineChart Component
interface LineChartCardProps {
  title: string;
  data: { date: string; sales: number }[];
  index?: number;
}

const LineChartCard: Component<LineChartCardProps> = (props) => {
  const responsive = useResponsive();
  const index = () => props.index ?? 0;

  return (
    <Motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        duration: 0.6,
        delay: 0.4 + index() * 0.1,
        easing: [0.4, 0, 0.2, 1],
      }}
    >
      <Card
        class={cn(
          'bg-gradient-to-br from-card to-muted/20 border-2 shadow-lg hover:shadow-xl transition-all duration-300',
          responsive.isMobile && 'shadow-md hover:shadow-lg'
        )}
      >
        <CardHeader class={cn(responsive.isMobile ? 'pb-2 px-4 pt-4' : 'pb-4')}>
          <div class="flex items-center gap-2">
            <div class={cn('bg-primary/10 rounded-lg', responsive.isMobile ? 'p-1.5' : 'p-2')}>
              <TrendingUpIcon class={cn('text-primary', responsive.isMobile ? 'h-4 w-4' : 'h-5 w-5')} />
            </div>
            <CardTitle
              class={cn('font-semibold text-card-foreground', responsive.isMobile ? 'text-sm' : 'text-lg')}
            >
              {props.title}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent class={responsive.isMobile ? 'px-4 pb-4' : ''}>
          <ResponsiveContainer width="100%" height={responsive.isMobile ? 200 : 300}>
            <LineChart data={props.data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="date"
                stroke="hsl(var(--muted-foreground))"
                fontSize={responsive.isMobile ? 10 : 12}
              />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={responsive.isMobile ? 10 : 12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: responsive.isMobile ? '12px' : '14px',
                }}
              />
              <Show when={!responsive.isMobile}>
                <Legend />
              </Show>
              <Line
                type="monotone"
                dataKey="sales"
                stroke="hsl(var(--primary))"
                strokeWidth={responsive.isMobile ? 2 : 3}
                dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: responsive.isMobile ? 3 : 4 }}
                activeDot={{ r: responsive.isMobile ? 4 : 6, stroke: 'hsl(var(--primary))', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </Motion.div>
  );
};

// PieChart Component
interface PieChartCardProps {
  title: string;
  data: { name: string; value: number }[];
  index?: number;
}

const PieChartCard: Component<PieChartCardProps> = (props) => {
  const responsive = useResponsive();
  const index = () => props.index ?? 0;

  return (
    <Motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        duration: 0.6,
        delay: 0.5 + index() * 0.1,
        easing: [0.4, 0, 0.2, 1],
      }}
    >
      <Card
        class={cn(
          'bg-gradient-to-br from-card to-success/5 border-2 border-success/20 shadow-lg hover:shadow-xl transition-all duration-300',
          responsive.isMobile && 'shadow-md hover:shadow-lg'
        )}
      >
        <CardHeader class={cn(responsive.isMobile ? 'pb-2 px-4 pt-4' : 'pb-4')}>
          <CardTitle
            class={cn(
              'font-semibold text-card-foreground flex items-center gap-2',
              responsive.isMobile ? 'text-sm' : 'text-lg'
            )}
          >
            <div class={cn('bg-success/10 rounded-lg', responsive.isMobile ? 'p-1.5' : 'p-2')}>
              <DollarSignIcon class={cn('text-success', responsive.isMobile ? 'h-4 w-4' : 'h-5 w-5')} />
            </div>
            {props.title}
          </CardTitle>
        </CardHeader>
        <CardContent class={responsive.isMobile ? 'px-4 pb-4' : ''}>
          <ResponsiveContainer width="100%" height={responsive.isMobile ? 200 : 300}>
            <PieChart>
              <Pie
                data={props.data}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={90}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
              >
                <For each={props.data}>
                  {(_, entryIndex) => (
                    <Cell key={`cell-${entryIndex()}`} fill={COLORS[entryIndex() % COLORS.length]} />
                  )}
                </For>
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </Motion.div>
  );
};

// Recent Orders Table Component
interface RecentOrdersTableProps {
  orders: Order[];
  index?: number;
}

const RecentOrdersTable: Component<RecentOrdersTableProps> = (props) => {
  const index = () => props.index ?? 0;
  const displayOrders = createMemo(() => props.orders.slice(0, 5));

  return (
    <Motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.6,
        delay: 0.6 + index() * 0.1,
        easing: [0.4, 0, 0.2, 1],
      }}
    >
      <Card class="bg-gradient-to-br from-card to-accent/5 border-2 border-accent/20 shadow-lg hover:shadow-xl transition-all duration-300">
        <CardHeader class="pb-4">
          <div class="flex items-center gap-2">
            <div class="bg-accent/10 p-2 rounded-lg">
              <ShoppingCartIcon class="h-5 w-5 text-accent" />
            </div>
            <CardTitle class="text-lg font-semibold text-card-foreground">
              Pedidos Recientes
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead class="text-muted-foreground font-semibold">ID</TableHead>
                <TableHead class="text-muted-foreground font-semibold">Fecha</TableHead>
                <TableHead class="text-muted-foreground font-semibold">Total</TableHead>
                <TableHead class="text-muted-foreground font-semibold">Ubicacion</TableHead>
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
                      delay: 0.8 + orderIndex() * 0.05,
                    }}
                    class="hover:bg-accent/5 transition-colors duration-200"
                  >
                    <TableCell class="font-medium">#{order.id}</TableCell>
                    <TableCell>{new Date(order.date).toLocaleDateString()}</TableCell>
                    <TableCell class="font-semibold text-success">
                      {order.total.toFixed(2)}€
                    </TableCell>
                    <TableCell>
                      <span class="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full font-medium">
                        {order.tableNumber ? `Mesa ${order.tableNumber}` : 'Barra'}
                      </span>
                    </TableCell>
                  </Motion.tr>
                )}
              </For>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Motion.div>
  );
};

// Top Products Card Component
interface TopProductsCardProps {
  products: { name: string; timesOrdered: number }[];
  index?: number;
}

const TopProductsCard: Component<TopProductsCardProps> = (props) => {
  const index = () => props.index ?? 0;

  return (
    <Motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.6,
        delay: 0.7 + index() * 0.1,
        easing: [0.4, 0, 0.2, 1],
      }}
    >
      <Card class="bg-gradient-to-br from-card to-warning/5 border-2 border-warning/20 shadow-lg hover:shadow-xl transition-all duration-300">
        <CardHeader class="pb-4">
          <div class="flex items-center gap-2">
            <div class="bg-warning/10 p-2 rounded-lg">
              <AwardIcon class="h-5 w-5 text-warning" />
            </div>
            <CardTitle class="text-lg font-semibold text-card-foreground">
              Top 5 Productos
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <ul class="space-y-3">
            <For each={props.products}>
              {(product, productIndex) => (
                <Motion.li
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    duration: 0.3,
                    delay: 0.9 + productIndex() * 0.05,
                  }}
                  class="flex justify-between items-center p-3 rounded-lg bg-background/50 hover:bg-warning/5 transition-colors duration-200"
                >
                  <div class="flex items-center gap-3">
                    <div class="flex items-center justify-center w-6 h-6 bg-warning/10 text-warning rounded-full text-sm font-bold">
                      {productIndex() + 1}
                    </div>
                    <span class="font-medium text-card-foreground">{product.name}</span>
                  </div>
                  <span class="px-2 py-1 bg-success/10 text-success text-xs rounded-full font-semibold">
                    {product.timesOrdered} pedidos
                  </span>
                </Motion.li>
              )}
            </For>
          </ul>
        </CardContent>
      </Card>
    </Motion.div>
  );
};

// Utility Functions
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

  // Memoized filtered orders based on date range
  const filteredOrders = createMemo(() => {
    const range = dateRange();
    return data.orderHistory.filter((order) => {
      const orderDate = new Date(order.date);
      return orderDate >= range.from && orderDate <= range.to;
    });
  });

  // Memoized statistics calculations
  const stats = createMemo(() => ({
    totalSales: getTotalSales(filteredOrders()),
    totalOrders: getTotalOrders(filteredOrders()),
    averageOrderValue: getAverageOrderValue(filteredOrders()),
    bestSellerProduct: getBestSellerProduct(filteredOrders()) || {
      name: 'No hay productos en el pedido',
      timesOrdered: 0,
    },
  }));

  // Memoized chart data calculations
  const chartData = createMemo(() => ({
    salesByCategory: getSalesByCategory(filteredOrders()),
    ordersByLocation: getOrdersByLocation(filteredOrders()),
    top5Products: getTop5Products(filteredOrders()),
    salesTrend: getSalesTrend(filteredOrders()),
  }));

  // Handler for date range changes
  const handleDateRangeChange = (values: {
    range: { from: Date; to: Date | undefined };
    rangeCompare?: { from: Date; to: Date | undefined } | undefined;
  }) => {
    const { from, to } = values.range;
    if (!from || !to) return;
    setDateRange({ from, to });
  };

  return (
    <div class="flex flex-col h-full overflow-hidden">
      <HomeHeader
        userName={props.userName}
        dateRange={dateRange()}
        handleDateRangeChange={handleDateRangeChange}
        isMobile={responsive.isMobile}
      />

      <div
        class={cn(
          'flex-grow overflow-y-auto',
          responsive.isMobile ? 'p-4 space-y-4' : 'p-4 space-y-4 lg:p-6 lg:space-y-6'
        )}
      >
        <StatsGrid stats={stats()} isMobile={responsive.isMobile} />

        {/* Charts and Tables Section - Optimized for all screen sizes */}
        <div
          class={cn(
            'grid gap-3',
            responsive.isMobile ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4',
            'lg:gap-4'
          )}
        >
          {/* Line Chart - Takes more space on larger screens */}
          <div class={cn(responsive.isMobile ? '' : 'lg:col-span-2 xl:col-span-2 2xl:col-span-2')}>
            <LineChartCard title="Tendencia de Ventas" data={chartData().salesTrend} index={0} />
          </div>

          {/* Category Pie Chart */}
          <div class={cn(responsive.isMobile ? '' : 'lg:col-span-1 xl:col-span-1 2xl:col-span-1')}>
            <PieChartCard title="Ventas por Categoria" data={chartData().salesByCategory} index={0} />
          </div>

          {/* Location Pie Chart */}
          <div class={cn(responsive.isMobile ? '' : 'lg:col-span-1 xl:col-span-1 2xl:col-span-1')}>
            <PieChartCard
              title="Pedidos por Ubicacion"
              data={chartData().ordersByLocation}
              index={1}
            />
          </div>
        </div>

        {/* Recent Orders and Top Products - Side by side on larger screens */}
        <div
          class={cn(
            'grid gap-3',
            responsive.isMobile ? 'grid-cols-1 space-y-4' : 'grid-cols-1 lg:grid-cols-2 lg:gap-4'
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
