import {create} from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { isErr, unwrapOr, tapErr } from '@mks2508/no-throw'
import User from "@/models/User"
import Order, {OrderItem} from "@/models/Order"
import {ThermalPrinterServiceOptions} from "@/models/ThermalPrinter"
import Category from "@/models/Category"
import Product from "@/models/Product"
import ITable from "@/models/Table"
import iconOptions from "@/assets/utils/icons/iconOptions"
import {BeerIcon} from "lucide-react"
import React from "react"

import { StorageMode, IStorageAdapter } from "@/services/storage-adapter.interface"
import { HttpStorageAdapter } from "@/services/http-storage-adapter"
import { IndexedDbStorageAdapter } from "@/services/indexeddb-storage-adapter"
import { SqliteStorageAdapter } from "@/services/sqlite-storage-adapter"

interface AppState {
    users: User[]
    selectedUser: User | null
    selectedOrder: Order | null
    selectedOrderId: number | null
    thermalPrinterOptions: ThermalPrinterServiceOptions | null
    tables: ITable[]
    categories: Category[]
    products: Product[]
    orderHistory: Order[]
    paymentMethod: string
    cashAmount: string
    showTicketDialog: boolean
    storageMode: StorageMode
    storageAdapter: IStorageAdapter
    useStockImages: boolean
    touchOptimizationsEnabled: boolean
    debugMode: boolean
    isBackendConnected: boolean
    setUsers: (users: User[]) => void
    setSelectedUser: (user: User | null) => void
    setSelectedOrder: (order: Order | null) => void
    setSelectedOrderId: (orderId: number | null) => void
    setThermalPrinterOptions: (options: ThermalPrinterServiceOptions | null) => void
    setTables: (tables: ITable[]) => void
    setCategories: (categories: Category[]) => void
    setProducts: (products: Product[]) => void
    setOrderHistory: (orderHistory: Order[]) => void
    activeOrders: Order[]
    recentProducts: Product[]
    setActiveOrders: (activeOrders: Order[]) => void
    addToOrder: (orderId: number, product: Product | OrderItem) => void
    setRecentProducts: (recentProducts: Product[]) => void
    removeFromOrder: (orderId: number, productId: number) => void
    setPaymentMethod: (method: string) => void
    setCashAmount: (amount: string) => void
    setShowTicketDialog: (show: boolean) => void
    setTouchOptimizationsEnabled: (enabled: boolean) => void
    setStorageMode: (mode: StorageMode) => void
    setUseStockImages: (use: boolean) => void
    setDebugMode: (enabled: boolean) => void
    setBackendConnected: (connected: boolean) => void
    handleTableChange: (tableId: number) => void
    handleCompleteOrder: (order: Order) => void
    closeOrder: (orderId: number) => void
}



// Initialize storage adapters
const sqliteAdapter = new SqliteStorageAdapter()
const httpAdapter = new HttpStorageAdapter()
const indexedDbAdapter = new IndexedDbStorageAdapter()

// Check if running in Tauri environment
const isTauri = (): boolean => {
    return typeof window !== 'undefined' && '__TAURI__' in window
}

// Get initial storage mode: sqlite when in Tauri, otherwise from localStorage or default to 'indexeddb'
const getInitialStorageMode = (): StorageMode => {
    // When running in Tauri, default to sqlite
    if (isTauri()) {
        try {
            const saved = localStorage.getItem('tpv-storage-mode') as StorageMode | null
            // Only use saved value if explicitly set, otherwise default to sqlite
            if (saved === 'sqlite' || saved === 'http' || saved === 'indexeddb') {
                return saved
            }
        } catch {
            // Ignore localStorage errors
        }
        return 'sqlite'
    }

    // When running in browser (development), use localStorage preference or indexeddb
    try {
        const saved = localStorage.getItem('tpv-storage-mode') as StorageMode | null
        return (saved === 'http' || saved === 'indexeddb') ? saved : 'indexeddb'
    } catch {
        return 'indexeddb'
    }
}

// Get storage adapter based on mode
const getStorageAdapterForMode = (mode: StorageMode): IStorageAdapter => {
    switch (mode) {
        case 'sqlite':
            return sqliteAdapter
        case 'http':
            return httpAdapter
        case 'indexeddb':
        default:
            return indexedDbAdapter
    }
}

// Get initial stock images setting from localStorage or default to true
const getInitialUseStockImages = (): boolean => {
    try {
        const saved = localStorage.getItem('tpv-use-stock-images')
        return saved === null ? true : saved === 'true'
    } catch {
        return true
    }
}

const initialStorageMode = getInitialStorageMode()

const useStore = create(immer<AppState>((set, get) => ({    users: [],
    selectedUser: null,
    selectedOrder: null,
    selectedOrderId: null,
    thermalPrinterOptions: null,
    tables: [],
    categories: [],
    products: [],
    storageMode: initialStorageMode,
    storageAdapter: getStorageAdapterForMode(initialStorageMode),
    useStockImages: getInitialUseStockImages(),
    debugMode: true, // Activado por defecto
    isBackendConnected: false,
    orderHistory: [{
        id: 1,
        date: '2023-03-01T00:00:00.000Z',
        total: 100,
        change: 0,
        totalPaid: 0,
        itemCount: 0,
        tableNumber: 0,
        paymentMethod: 'efectivo',
        ticketPath: '',
        status: 'paid',
        items: [{
            id: 1,
            name: 'Cafe solo',
            quantity: 1,
            price: 10,
            category: 'Cafes',
            brand: 'El Haido',
            icon: React.createElement(iconOptions.find(option => option.value === 'CoffeeIcon')?.icon || BeerIcon),
            iconType: 'preset',
            selectedIcon: '',
            uploadedImage: null,
        }]
    }],
    paymentMethod: 'efectivo',
    selectedLanguage: 'es',
    cashAmount: '',
    showTicketDialog: false,
    activeOrders: [],
    recentProducts: [],
    touchOptimizationsEnabled: false,
// Methods
    setUsers: (users) => set((state) => { state.users = users }),
    setSelectedUser: (user) => set((state) => { state.selectedUser = user }),
    setSelectedOrder: (order) => set((state) => { state.selectedOrder = order }),
    setSelectedOrderId: (orderId) => set((state) => {
        state.selectedOrderId = orderId;
        state.selectedOrder = state.activeOrders.find((o: Order) => o.id === orderId) || null;
    }),
    setThermalPrinterOptions: (options) => set((state) => { state.thermalPrinterOptions = options }),
    setTables: (tables) => set((state) => { state.tables = tables }),
    setCategories: (categories) => set((state) => { state.categories = categories }),
    setProducts: (products) => set((state) => {
        // Deduplicar productos por ID para evitar duplicados
        const uniqueProducts = products.filter((product, index, self) =>
            index === self.findIndex(p => p.id === product.id)
        )
        state.products = uniqueProducts
    }),
    setOrderHistory: (orderHistory) => set((state) => { state.orderHistory = orderHistory }),
    setActiveOrders: (activeOrders) => set((state) => { state.activeOrders = activeOrders }),
    setRecentProducts: (recentProducts) => set((state) => { state.recentProducts = recentProducts }),
    setPaymentMethod: (method) => set((state) => { state.paymentMethod = method }),
    setCashAmount: (amount) => set((state) => { state.cashAmount = amount }),
    setShowTicketDialog: (show) => set((state) => { state.showTicketDialog = show }),
    setSelectedLanguage: (language: string) => set((state) => { (state as any).selectedLanguage = language }),
    setUseStockImages: (use: boolean) => set((state) => {
        state.useStockImages = use
        localStorage.setItem('tpv-use-stock-images', use.toString())
    }),
    setTouchOptimizationsEnabled: (enabled) => set((state) => {
        state.touchOptimizationsEnabled = enabled
        localStorage.setItem('tpv-touch-optimizations', enabled.toString())
    }),

    setDebugMode: (enabled) => set((state) => {
        state.debugMode = enabled
        localStorage.setItem('tpv-debug-mode', enabled.toString())
    }),

    setBackendConnected: (connected) => set((state) => {
        state.isBackendConnected = connected
    }),

    // Storage management methods
    setStorageMode: (mode: StorageMode) => set((state) => {
        state.storageMode = mode
        state.storageAdapter = getStorageAdapterForMode(mode)
        localStorage.setItem('tpv-storage-mode', mode)
    }),
    getStorageAdapter: () => {
        const state = get()
        return state.storageAdapter
    },

    handleTableChange: async (tableId: number) => {
        const state = get()
        const storageAdapter = state.storageAdapter
        console.log(`[handleTableChange] Changing to table ${tableId}`)

        // Buscar si ya existe una orden para esta mesa especifica
        const existingOrder = state.activeOrders.find((order: Order) =>
            order.tableNumber === tableId && order.status === 'inProgress'
        )

        if (existingOrder) {
            console.log(`[handleTableChange] Found existing order ${existingOrder.id} for table ${tableId}`)
            set((state) => {
                state.selectedOrderId = existingOrder.id
                state.selectedOrder = existingOrder
            })
        } else {
            // Solo buscar ordenes vacias que NO tengan mesa asignada (tableNumber === 0 o null)
            const emptyOrdersWithoutTable = state.activeOrders.filter((order: Order) =>
                order.items.length === 0 && (order.tableNumber === 0 || order.tableNumber === null)
            )

            if (emptyOrdersWithoutTable.length > 0) {
                console.log(`[handleTableChange] Assigning empty order ${emptyOrdersWithoutTable[0].id} to table ${tableId}`)
                const updatedOrder: Order = { ...emptyOrdersWithoutTable[0], tableNumber: tableId }

                const result = await storageAdapter.updateOrder(updatedOrder)

                tapErr(result, (error) => {
                    console.error('[handleTableChange] Error updating empty order:', error.code, error.message)
                })

                if (!isErr(result)) {
                    set((state) => {
                        const orderIndex = state.activeOrders.findIndex((order: Order) => order.id === emptyOrdersWithoutTable[0].id)
                        if (orderIndex !== -1) {
                            state.activeOrders[orderIndex] = updatedOrder
                        }
                        state.selectedOrderId = emptyOrdersWithoutTable[0].id
                        state.selectedOrder = updatedOrder
                    })
                }
            } else {
                console.log(`[handleTableChange] Creating new order for table ${tableId}`)
                // Generar ID unico mas robusto
                const newId = Date.now() + Math.floor(Math.random() * 1000)
                const newOrder: Order = {
                    id: newId,
                    tableNumber: tableId,
                    status: 'inProgress',
                    ticketPath: '',
                    paymentMethod: 'efectivo',
                    items: [],
                    total: 0,
                    date: new Date().toISOString().split('T')[0],
                    itemCount: 0,
                    totalPaid: 0,
                    change: 0,
                }

                const result = await storageAdapter.createOrder(newOrder)

                tapErr(result, (error) => {
                    console.error('[handleTableChange] Error creating new order:', error.code, error.message)
                })

                if (!isErr(result)) {
                    set((state) => {
                        state.activeOrders.push(newOrder)
                        state.selectedOrderId = newOrder.id
                        state.selectedOrder = newOrder
                    })
                }
            }
        }
    },

    handleCompleteOrder: async (order: Order) => {
        const state = get()
        const storageAdapter = state.storageAdapter
        const currentOrder = state.activeOrders.find((o: Order) => o.id === order.id) || order
        const completedOrder: Order = {
            ...currentOrder,
            status: 'paid',
            itemCount: currentOrder.items.reduce((sum: number, item: { quantity: number }) => sum + item.quantity, 0),
            ticketPath: `/home/mks/WebStormProjects/tpv/tickets/ticket-${currentOrder.id}_${new Date().toISOString().split('T')[0]}.pdf`,
        }

        const result = await storageAdapter.updateOrder(completedOrder)

        tapErr(result, (error) => {
            console.error('[handleCompleteOrder] Error updating order:', error.code, error.message)
        })

        if (!isErr(result)) {
            set((state) => {
                state.orderHistory.push(completedOrder)
                state.activeOrders = state.activeOrders.filter((o: Order) => o.id !== completedOrder.id)
                state.paymentMethod = 'efectivo'
                state.cashAmount = ''
                state.showTicketDialog = false
                state.selectedOrderId = null
            })
        }
    },

    closeOrder: async (orderId: number) => {
        const state = get()
        const storageAdapter = state.storageAdapter
        const orderToDelete = state.activeOrders.find((o: Order) => o.id === orderId)

        if (orderToDelete) {
            const result = await storageAdapter.deleteOrder(orderToDelete)

            tapErr(result, (error) => {
                console.error('[closeOrder] Error deleting order:', error.code, error.message)
            })
        }

        set((state) => {
            state.activeOrders = state.activeOrders.filter((o: Order) => o.id !== orderId)
            state.orderHistory = state.orderHistory.filter((o: Order) => o.id !== orderId)
            if (state.selectedOrderId === orderId) {
                state.selectedOrderId = state.activeOrders.length > 0 ? state.activeOrders[0].id : null
            }
        })
    },

    addToOrder: async (orderId: number, item: Product | OrderItem) => {
        set((state) => {
            const orderIndex = state.activeOrders.findIndex((order: Order) => order.id === orderId)
            if (orderIndex !== -1) {
                const order = state.activeOrders[orderIndex]
                const existingItemIndex = order.items.findIndex((orderItem: OrderItem) => orderItem.id === item.id)
                if (existingItemIndex !== -1) {
                    order.items[existingItemIndex].quantity += 1
                } else {
                    order.items.push({
                        name: item.name,
                        price: item.price,
                        id: item.id,
                        quantity: 'quantity' in item ? item.quantity : 1,
                        category: item.category
                    })
                }
                order.itemCount += 1
                order.total += item.price
            }
        })

        const updatedOrder = get().activeOrders.find((order: Order) => order.id === orderId)
        if (updatedOrder) {
            const storageAdapter = get().storageAdapter
            const result = await storageAdapter.updateOrder(updatedOrder)

            tapErr(result, (error) => {
                console.error('[addToOrder] Error updating order:', error.code, error.message)
            })
        }
    },

    removeFromOrder: async (orderId: number, productId: number) => {
        console.log(`[removeFromOrder] Removing product ${productId} from order ${orderId}`)

        set((state) => {
            const orderIndex = state.activeOrders.findIndex((order: Order) => order.id === orderId)
            if (orderIndex !== -1) {
                const order = state.activeOrders[orderIndex]
                const existingItemIndex = order.items.findIndex((item: { id: number }) => item.id === productId)

                if (existingItemIndex !== -1) {
                    const item = order.items[existingItemIndex]
                    console.log(`[removeFromOrder] Current item: ${item.name}, quantity: ${item.quantity}, price: ${item.price}`)

                    if (item.quantity > 1) {
                        item.quantity -= 1
                        order.itemCount = Math.max(0, order.itemCount - 1)
                        order.total = Math.max(0, order.total - item.price)
                    } else {
                        order.items.splice(existingItemIndex, 1)
                        order.itemCount = Math.max(0, order.itemCount - 1)
                        order.total = Math.max(0, order.total - item.price)
                    }

                    // Recalcular total desde cero para asegurar exactitud
                    order.total = order.items.reduce((sum, orderItem) =>
                        sum + (orderItem.price * orderItem.quantity), 0
                    )
                    order.itemCount = order.items.reduce((sum, orderItem) =>
                        sum + orderItem.quantity, 0
                    )

                    console.log(`[removeFromOrder] New totals: total=${order.total}, itemCount=${order.itemCount}`)
                }
            }
        })

        const updatedOrder = get().activeOrders.find((order: Order) => order.id === orderId)
        if (updatedOrder) {
            const storageAdapter = get().storageAdapter
            const result = await storageAdapter.updateOrder(updatedOrder)

            tapErr(result, (error) => {
                console.error('[removeFromOrder] Error updating order:', error.code, error.message)
            })
        }
    },
})))

export default useStore
