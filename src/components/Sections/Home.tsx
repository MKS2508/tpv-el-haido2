import React, { useState, memo, useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSignIcon, ShoppingCartIcon, AwardIcon, TrendingUpIcon } from "lucide-react"
import { motion } from "framer-motion"
import NumberFlow from '@number-flow/react'
import { useResponsive } from "@/hooks/useResponsive"
import { cn } from '@/lib/utils'
import {
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Tooltip,
    Legend,
    LineChart,
    CartesianGrid,
    XAxis,
    YAxis, 
    Line
} from 'recharts'
import { useHomeData } from "@/store/selectors"
import Order from "@/models/Order.ts"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.tsx"
import { DateRangePicker } from "@/components/ui/DateRangePicker.tsx"

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))']

// Header Component
const HomeHeader = ({ userName, dateRange, setDateRange, isMobile }: {
    userName: string
    dateRange: { from: Date, to: Date }
    setDateRange: (range: { from: Date, to: Date }) => void
    isMobile: boolean
}) => (
    <motion.div 
        className={cn(
            "flex-none bg-background border-b border-border/50",
            isMobile ? "p-4 pb-3" : "p-6"
        )}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
    >
        <div className={cn(
            "flex items-center",
            isMobile ? "flex-col gap-3" : "justify-between"
        )}>
            <div className={isMobile ? "text-center" : ""}>
                <h2 className={cn(
                    "font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent",
                    isMobile ? "text-xl" : "text-3xl"
                )}>
                    ¡Hola {userName}!
                </h2>
                <p className={cn(
                    "text-muted-foreground mt-1",
                    isMobile ? "text-sm" : "text-lg"
                )}>
                    Bienvenido de nuevo al TPV de El Haido.
                </p>
            </div>
            
            {!isMobile && (
                <DateRangePicker
                    initialDateFrom={dateRange.from}
                    initialDateTo={dateRange.to}
                    onUpdate={handleDateRangeChange}
                />
            )}
        </div>
    </motion.div>
)

// Stats Card Component
type StatCardProps = {
    title: string,
    value: string | number,
    numericValue?: number,
    suffix?: string,
    prefix?: string,
    isAnimated?: boolean,
    Icon: React.ElementType,
    variant?: 'success' | 'primary' | 'accent' | 'warning',
    index?: number
}

const cardVariants = {
    success: {
        cardClass: "bg-gradient-to-br from-success/5 to-success/10 border-success/20 shadow-success/5 hover:shadow-success/10",
        iconClass: "h-5 w-5 text-success",
        iconBg: "bg-success/10"
    },
    primary: {
        cardClass: "bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 shadow-primary/5 hover:shadow-primary/10",
        iconClass: "h-5 w-5 text-primary", 
        iconBg: "bg-primary/10"
    },
    accent: {
        cardClass: "bg-gradient-to-br from-accent/5 to-accent/10 border-accent/20 shadow-accent/5 hover:shadow-accent/10",
        iconClass: "h-5 w-5 text-accent",
        iconBg: "bg-accent/10"
    },
    warning: {
        cardClass: "bg-gradient-to-br from-warning/5 to-warning/10 border-warning/20 shadow-warning/5 hover:shadow-warning/10",
        iconClass: "h-5 w-5 text-warning",
        iconBg: "bg-warning/10"
    }
}

const StatCard = ({ title, value, numericValue, suffix = '', prefix = '', isAnimated = false, Icon, variant = 'primary', index = 0 }: StatCardProps) => {
    const variantStyles = cardVariants[variant]
    const { isMobile } = useResponsive()
    
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ 
                duration: 0.5, 
                delay: index * 0.1,
                ease: [0.4, 0, 0.2, 1]
            }}
            whileHover={{ 
                y: -4,
                transition: { duration: 0.2 }
            }}
        >
            <Card className={cn(
                `${variantStyles.cardClass} shadow-lg transition-all duration-300 hover:shadow-xl border-2`,
                isMobile && "shadow-md hover:shadow-lg"
            )}>
                <CardHeader className={cn(
                    "flex flex-row items-center justify-between space-y-0",
                    isMobile ? "pb-1 px-3 pt-3" : "pb-3"
                )}>
                    <CardTitle className={cn(
                        "font-semibold text-card-foreground",
                        isMobile ? "text-xs leading-tight" : "text-sm"
                    )}>
                        {title}
                    </CardTitle>
                    <div className={cn(
                        `${variantStyles.iconBg} rounded-lg transition-transform duration-200 hover:scale-110`,
                        isMobile ? "p-1.5" : "p-2"
                    )}>
                        {React.createElement(Icon, { 
                            className: cn(
                                variantStyles.iconClass,
                                isMobile ? "h-4 w-4" : "h-5 w-5"
                            )
                        })}
                    </div>
                </CardHeader>
                <CardContent className={cn(
                    "pt-0",
                    isMobile ? "px-3 pb-3" : ""
                )}>
                    <motion.div 
                        className={cn(
                            "font-bold text-card-foreground",
                            isMobile ? "text-lg" : "text-3xl"
                        )}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ 
                            duration: 0.6, 
                            delay: index * 0.1 + 0.2
                        }}
                    >
                        {isAnimated && numericValue !== undefined ? (
                            <NumberFlow 
                                value={numericValue}
                                format={{ minimumFractionDigits: suffix === '€' ? 2 : 0 }}
                                suffix={suffix}
                                prefix={prefix}
                                transformTiming={{ duration: 400, easing: 'ease-out' }}
                                opacityTiming={{ duration: 200, easing: 'ease-out' }}
                                willChange
                                style={{
                                    fontVariantNumeric: 'tabular-nums',
                                    '--number-flow-char-height': '0.85em',
                                    '--number-flow-mask-height': '0.25em'
                                } as React.CSSProperties}
                            />
                        ) : (
                            value
                        )}
                    </motion.div>
                </CardContent>
            </Card>
        </motion.div>
    )
}

// Stats Grid Component
const StatsGrid = ({ stats, isMobile }: {
    stats: {
        totalSales: number
        totalOrders: number
        averageOrderValue: number
        bestSellerProduct: { name: string, timesOrdered: number }
    }
    isMobile: boolean
}) => (
    <div className={cn(
        "grid gap-4",
        isMobile ? "grid-cols-2" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
    )}>
        <StatCard 
            title="Ventas Totales" 
            value={`${stats.totalSales.toFixed(2)}€`}
            numericValue={stats.totalSales}
            suffix="€"
            isAnimated={true}
            Icon={DollarSignIcon}
            variant="success"
            index={0}
        />
        <StatCard 
            title="Pedidos Totales" 
            value={stats.totalOrders.toString()}
            numericValue={stats.totalOrders}
            isAnimated={true}
            Icon={ShoppingCartIcon}
            variant="primary"
            index={1}
        />
        <StatCard 
            title="Valor Promedio de Pedido" 
            value={`${stats.averageOrderValue.toFixed(2)}€`}
            numericValue={stats.averageOrderValue}
            suffix="€"
            isAnimated={true}
            Icon={TrendingUpIcon}
            variant="accent"
            index={2}
        />
        <StatCard 
            title="Best Seller" 
            value={stats.bestSellerProduct.name}
            Icon={AwardIcon}
            variant="warning"
            index={3}
        />
    </div>
)

// LineChart Component
type LineChartCardProps = {
    title: string,
    data: { date: string, sales: number }[],
    index?: number
}

const LineChartCard = ({ title, data, index = 0 }: LineChartCardProps) => {
    const { isMobile } = useResponsive()
    
    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ 
                duration: 0.6, 
                delay: 0.4 + index * 0.1,
                ease: [0.4, 0, 0.2, 1]
            }}
        >
            <Card className={cn(
                "bg-gradient-to-br from-card to-muted/20 border-2 shadow-lg hover:shadow-xl transition-all duration-300",
                isMobile && "shadow-md hover:shadow-lg"
            )}>
                <CardHeader className={cn(
                    isMobile ? "pb-2 px-4 pt-4" : "pb-4"
                )}>
                    <div className="flex items-center gap-2">
                        <div className={cn(
                            "bg-primary/10 rounded-lg",
                            isMobile ? "p-1.5" : "p-2"
                        )}>
                            <TrendingUpIcon className={cn(
                                "text-primary",
                                isMobile ? "h-4 w-4" : "h-5 w-5"
                            )} />
                        </div>
                        <CardTitle className={cn(
                            "font-semibold text-card-foreground",
                            isMobile ? "text-sm" : "text-lg"
                        )}>{title}</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className={isMobile ? "px-4 pb-4" : ""}>
                    <ResponsiveContainer width="100%" height={isMobile ? 200 : 300}>
                        <LineChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis 
                                dataKey="date" 
                                stroke="hsl(var(--muted-foreground))"
                                fontSize={isMobile ? 10 : 12}
                            />
                            <YAxis 
                                stroke="hsl(var(--muted-foreground))"
                                fontSize={isMobile ? 10 : 12}
                            />
                            <Tooltip 
                                contentStyle={{
                                    backgroundColor: 'hsl(var(--background))',
                                    border: '1px solid hsl(var(--border))',
                                    borderRadius: '8px',
                                    fontSize: isMobile ? '12px' : '14px'
                                }}
                            />
                            {!isMobile && <Legend />}
                            <Line 
                                type="monotone" 
                                dataKey="sales" 
                                stroke="hsl(var(--primary))" 
                                strokeWidth={isMobile ? 2 : 3}
                                dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: isMobile ? 3 : 4 }}
                                activeDot={{ r: isMobile ? 4 : 6, stroke: "hsl(var(--primary))", strokeWidth: 2 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </motion.div>
    )
}

// PieChart Component
type PieChartCardProps = {
    title: string,
    data: { name: string, value: number }[],
    index?: number
}

const PieChartCard = ({ title, data, index = 0 }: PieChartCardProps) => {
    const { isMobile } = useResponsive()
    
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ 
                duration: 0.6, 
                delay: 0.5 + index * 0.1,
                ease: [0.4, 0, 0.2, 1]
            }}
        >
            <Card className={cn(
                "bg-gradient-to-br from-card to-success/5 border-2 border-success/20 shadow-lg hover:shadow-xl transition-all duration-300",
                isMobile && "shadow-md hover:shadow-lg"
            )}>
                <CardHeader className={cn(
                    isMobile ? "pb-2 px-4 pt-4" : "pb-4"
                )}>
                    <CardTitle className={cn(
                        "font-semibold text-card-foreground flex items-center gap-2",
                        isMobile ? "text-sm" : "text-lg"
                    )}>
                        <div className={cn(
                            "bg-success/10 rounded-lg",
                            isMobile ? "p-1.5" : "p-2"
                        )}>
                            <DollarSignIcon className={cn(
                                "text-success",
                                isMobile ? "h-4 w-4" : "h-5 w-5"
                            )} />
                        </div>
                        {title}
                    </CardTitle>
                </CardHeader>
                <CardContent className={isMobile ? "px-4 pb-4" : ""}>
                    <ResponsiveContainer width="100%" height={isMobile ? 200 : 300}>
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                outerRadius={90}
                                fill="#8884d8"
                                dataKey="value"
                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            >
                                {data.map((_, entryIndex) => (
                                    <Cell key={`cell-${entryIndex}`} fill={COLORS[entryIndex % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip 
                                contentStyle={{
                                    backgroundColor: 'hsl(var(--background))',
                                    border: '1px solid hsl(var(--border))',
                                    borderRadius: '8px'
                                }}
                            />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </motion.div>
    )
}

// Recent Orders Table Component
type RecentOrdersTableProps = {
    orders: Order[],
    index?: number
}

const RecentOrdersTable = ({ orders, index = 0 }: RecentOrdersTableProps) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ 
            duration: 0.6, 
            delay: 0.6 + index * 0.1,
            ease: [0.4, 0, 0.2, 1]
        }}
    >
        <Card className="bg-gradient-to-br from-card to-accent/5 border-2 border-accent/20 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                    <div className="bg-accent/10 p-2 rounded-lg">
                        <ShoppingCartIcon className="h-5 w-5 text-accent" />
                    </div>
                    <CardTitle className="text-lg font-semibold text-card-foreground">Pedidos Recientes</CardTitle>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="text-muted-foreground font-semibold">ID</TableHead>
                            <TableHead className="text-muted-foreground font-semibold">Fecha</TableHead>
                            <TableHead className="text-muted-foreground font-semibold">Total</TableHead>
                            <TableHead className="text-muted-foreground font-semibold">Ubicación</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {orders.slice(0, 5).map((order, orderIndex) => (
                            <motion.tr 
                                key={order.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ 
                                    duration: 0.3,
                                    delay: 0.8 + orderIndex * 0.05
                                }}
                                className="hover:bg-accent/5 transition-colors duration-200"
                            >
                                <TableCell className="font-medium">#{order.id}</TableCell>
                                <TableCell>{new Date(order.date).toLocaleDateString()}</TableCell>
                                <TableCell className="font-semibold text-success">{order.total.toFixed(2)}€</TableCell>
                                <TableCell>
                                    <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full font-medium">
                                        {order.tableNumber ? `Mesa ${order.tableNumber}` : 'Barra'}
                                    </span>
                                </TableCell>
                            </motion.tr>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    </motion.div>
)

// Top Products Card Component
type TopProductsCardProps = {
    products: { name: string, timesOrdered: number }[],
    index?: number
}

const TopProductsCard = ({ products, index = 0 }: TopProductsCardProps) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ 
            duration: 0.6, 
            delay: 0.7 + index * 0.1,
            ease: [0.4, 0, 0.2, 1]
        }}
    >
        <Card className="bg-gradient-to-br from-card to-warning/5 border-2 border-warning/20 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                    <div className="bg-warning/10 p-2 rounded-lg">
                        <AwardIcon className="h-5 w-5 text-warning" />
                    </div>
                    <CardTitle className="text-lg font-semibold text-card-foreground">Top 5 Productos</CardTitle>
                </div>
            </CardHeader>
            <CardContent>
                <ul className="space-y-3">
                    {products.map((product, productIndex) => (
                        <motion.li 
                            key={product.name}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ 
                                duration: 0.3,
                                delay: 0.9 + productIndex * 0.05
                            }}
                            className="flex justify-between items-center p-3 rounded-lg bg-background/50 hover:bg-warning/5 transition-colors duration-200"
                        >
                            <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center w-6 h-6 bg-warning/10 text-warning rounded-full text-sm font-bold">
                                    {productIndex + 1}
                                </div>
                                <span className="font-medium text-card-foreground">{product.name}</span>
                            </div>
                            <span className="px-2 py-1 bg-success/10 text-success text-xs rounded-full font-semibold">
                                {product.timesOrdered} pedidos
                            </span>
                        </motion.li>
                    ))}
                </ul>
            </CardContent>
        </Card>
    </motion.div>
)

// Utility Functions
const getTotalSales = (orderHistory: Order[]) => {
    return orderHistory.reduce((total, order) => total + order.total, 0)
}

const getTotalOrders = (orderHistory: Order[]) => {
    return orderHistory.filter(order => order.items.length > 0).length
}

const getAverageOrderValue = (orderHistory: Order[]) => {
    if (orderHistory.length === 0) return 0
    return getTotalSales(orderHistory) / orderHistory.length
}

const getBestSellerProduct = (orderHistory: Order[]): {name: string, timesOrdered: number} | null => {
    const timesOrdered: {name: string, timesOrdered: number}[] = []
    orderHistory.forEach(order => {
        order.items.forEach(item => {
            const product = item.name
            const quantity = item.quantity
            const existingProduct = timesOrdered.find(p => p.name === product)
            if (existingProduct) {
                existingProduct.timesOrdered += quantity
            } else {
                timesOrdered.push({name: product, timesOrdered: quantity})
            }
        })
    })

    return timesOrdered.sort((a, b) => b.timesOrdered - a.timesOrdered)[0] || null
}

const getSalesByCategory = (orderHistory: Order[]) => {
    const salesByCategory: {name: string, value: number}[] = []
    orderHistory.forEach(order => {
        order.items.forEach(item => {
            const product = item.category
            const quantity = 1
            const existingProduct = salesByCategory.find(p => p.name === product)
            if (existingProduct) {
                existingProduct.value += quantity
            } else {
                salesByCategory.push({name: product, value: quantity})
            }
        })
    })
    return salesByCategory.sort((a, b) => b.value - a.value)
}

const getOrdersByLocation = (orderHistory: Order[]) => {
    const ordersByLocation: {name: string, value: number}[] = []
    orderHistory.forEach(order => {
        const isTable = order.tableNumber !== 0
        const location = isTable ? `Mesa ${order.tableNumber}` : 'Barra'
        const existingLocation = ordersByLocation.find(p => p.name === location)
        if (existingLocation) {
            existingLocation.value += 1
        } else {
            ordersByLocation.push({name: location, value: 1})
        }
    })
    return ordersByLocation.sort((a, b) => b.value - a.value)
}

const getTop5Products = (orderHistory: Order[]): {name: string, timesOrdered: number}[] => {
    const timesOrdered: {name: string, timesOrdered: number}[] = []
    orderHistory.forEach(order => {
        order.items.forEach(item => {
            const product = item.name
            const quantity = item.quantity
            const existingProduct = timesOrdered.find(p => p.name === product)
            if (existingProduct) {
                existingProduct.timesOrdered += quantity
            } else {
                timesOrdered.push({name: product, timesOrdered: quantity})
            }
        })
    })
    return timesOrdered.sort((a, b) => b.timesOrdered - a.timesOrdered).slice(0, 5)
}

const getSalesTrend = (orderHistory: Order[]): {date: string, sales: number}[] => {
    const salesByDate: {[key: string]: number} = {}
    orderHistory.forEach(order => {
        const date = new Date(order.date).toISOString().split('T')[0]
        if (salesByDate[date]) {
            salesByDate[date] += order.total
        } else {
            salesByDate[date] = order.total
        }
    })
    return Object.entries(salesByDate).map(([date, sales]) => ({date, sales}))
}


type HomeProps = {
    userName: string
}

const Home = memo(({ userName }: HomeProps) => {
    const { orderHistory } = useHomeData()
    const { isMobile } = useResponsive()
    const [dateRange, setDateRange] = useState({ 
        from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 
        to: new Date() 
    })

    // Memoizar filtros pesados para evitar recálculos innecesarios
    const filteredOrders = useMemo(() => {
        return orderHistory.filter(order => {
            const orderDate = new Date(order.date)
            return orderDate >= dateRange.from && orderDate <= dateRange.to
        })
    }, [orderHistory, dateRange.from, dateRange.to])

    // Memoizar cálculos pesados de estadísticas
    const stats = useMemo(() => ({
        totalSales: getTotalSales(filteredOrders),
        totalOrders: getTotalOrders(filteredOrders),
        averageOrderValue: getAverageOrderValue(filteredOrders),
        bestSellerProduct: getBestSellerProduct(filteredOrders) || {name: 'No hay productos en el pedido', timesOrdered: 0}
    }), [filteredOrders])

    // Memoizar cálculos pesados de gráficos
    const chartData = useMemo(() => ({
        salesByCategory: getSalesByCategory(filteredOrders),
        ordersByLocation: getOrdersByLocation(filteredOrders),
        top5Products: getTop5Products(filteredOrders),
        salesTrend: getSalesTrend(filteredOrders)
    }), [filteredOrders])

    // Callback memoizado para cambios de fecha
    const handleDateRangeChange = useCallback(({range}: {range: {from: Date, to: Date}}) => {
        const {from, to} = range
        if (!from || !to) return
        setDateRange({from, to})
    }, [])

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <HomeHeader 
                userName={userName}
                dateRange={dateRange}
                setDateRange={setDateRange}
                isMobile={isMobile}
            />

            <div className={cn(
                "flex-grow overflow-y-auto",
                isMobile ? "p-4 space-y-4" : "p-4 space-y-4 lg:p-6 lg:space-y-6"
            )}>
                <StatsGrid stats={stats} isMobile={isMobile} />
                
                {/* Charts and Tables Section - Optimized for all screen sizes */}
                <div className={cn(
                    "grid gap-3",
                    isMobile ? "grid-cols-1" : 
                    "grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4",
                    "lg:gap-4"
                )}>
                    {/* Line Chart - Takes more space on larger screens */}
                    <div className={cn(
                        isMobile ? "" : 
                        "lg:col-span-2 xl:col-span-2 2xl:col-span-2"
                    )}>
                        <LineChartCard title="Tendencia de Ventas" data={chartData.salesTrend} index={0}/>
                    </div>
                    
                    {/* Category Pie Chart */}
                    <div className={cn(
                        isMobile ? "" : 
                        "lg:col-span-1 xl:col-span-1 2xl:col-span-1"
                    )}>
                        <PieChartCard title="Ventas por Categoría" data={chartData.salesByCategory} index={0}/>
                    </div>
                    
                    {/* Location Pie Chart */}
                    <div className={cn(
                        isMobile ? "" : 
                        "lg:col-span-1 xl:col-span-1 2xl:col-span-1"
                    )}>
                        <PieChartCard title="Pedidos por Ubicación" data={chartData.ordersByLocation} index={1}/>
                    </div>
                </div>
                
                {/* Recent Orders and Top Products - Side by side on larger screens */}
                <div className={cn(
                    "grid gap-3",
                    isMobile ? "grid-cols-1 space-y-4" : 
                    "grid-cols-1 lg:grid-cols-2 lg:gap-4"
                )}>
                    <RecentOrdersTable orders={filteredOrders} index={0}/>
                    <TopProductsCard products={chartData.top5Products} index={1}/>
                </div>
            </div>
        </div>
    )
})

Home.displayName = 'Home'

export default Home