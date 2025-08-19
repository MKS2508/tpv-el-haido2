import "./App.css";
import React, {useEffect, useRef} from 'react'
import { useAppTheme } from '@/lib/theme-context'
import {Card, CardContent} from "@/components/ui/card"
import {BeerIcon, ClipboardListIcon, HistoryIcon, HomeIcon, PlusCircleIcon, SettingsIcon} from 'lucide-react'
import {AnimatePresence, motion} from 'framer-motion'
import { cn } from '@/lib/utils';
import { useAppData } from '@/store/selectors'
import { useSectionTitle } from '@/hooks/useDocumentTitle'
import { useCallback } from 'react'
import Sidebar from "@/components/SideBar.tsx";
import SidebarToggleButton from "@/components/SideBarToggleButton.tsx";
import BottomNavigation from "@/components/BottomNavigation.tsx";
import { useResponsive } from "@/hooks/useResponsive";
//import productsJson from '@/assets/products.json';
import iconOptions from "@/assets/utils/icons/iconOptions.ts";
import Home from "@/components/Sections/Home.tsx";
import OrderHistory from "@/components/Sections/OrderHistory.tsx";
import SectionHeader from "@/components/Sections/SectionHeader.tsx";
import Products from "@/components/Sections/Products.tsx";
import NewOrder from "@/components/Sections/NewOrder.tsx";
import {Toaster} from "@/components/ui/toaster.tsx";
import SettingsPanel from "@/components/Sections/SettingsPanel.tsx";
import Login from "@/components/Sections/Login.tsx";
import {PrinterTypes, CharacterSet, BreakLine, ThermalPrinterServiceOptions} from "@/models/ThermalPrinter.ts";
import ProductService from "@/services/products.service.ts";
import Product from "@/models/Product.ts";
import CategoriesService from "@/services/categories.service.ts";
import OrderService from "@/services/orders.service.ts";
import DebugIndicator from "@/components/DebugIndicator.tsx";

function App() {
    const {
        users,
        selectedUser,
        selectedOrder,
        thermalPrinterOptions,
        tables,
        categories,
        products,
        touchOptimizationsEnabled, // New property
        debugMode,
        setBackendConnected,

        setUsers,
        setSelectedUser,
        setSelectedOrder,
        setSelectedOrderId,
        setThermalPrinterOptions,
        setTables,
        setCategories,
        setProducts,

        setOrderHistory
    } = useStore()

    // Use the perfect new theme system
    const { mode, setMode } = useAppTheme()
    const { isMobile, isTablet } = useResponsive()

    const [activeSection, setActiveSection] = React.useState('home')
    const [isSidebarOpen, setIsSidebarOpen] = React.useState(!isMobile && !isTablet) // Start closed on mobile/tablet
    const prevSectionRef = useRef('home')
    
    // Update document title based on active section
    useSectionTitle(activeSection)
    
    const toggleDarkMode = () => {
        setMode(mode === 'dark' ? 'light' : 'dark')
    }

    const handleThermalPrinterOptionsChange = (options: ThermalPrinterServiceOptions | null) => {
        setThermalPrinterOptions(options);
    }
    const _productService = new ProductService();
    const _categoryService = new CategoriesService();
    const _orderService = new OrderService();
    // Initialize state if it's empty
    useEffect(() => {
        const initializeCategories = async () => {
            if (categories.length === 0) {
                try {
                    const categories_from_service = await _categoryService.getCategories();
                    setCategories(categories_from_service)
                    
                    // Si recibimos categorías, verificar si el backend responde
                    if (categories_from_service.length > 0) {
                        setBackendConnected(true);
                    }
                } catch (error) {
                    console.error("Error initializing categories:", error);
                    setBackendConnected(false);
                }
            }
        }
        const initializeProduts = async (products: Product[]) => {
            if (products.length === 0) {
                try {
                    const products_from_service = await _productService.getProducts();
                    const productsWithIcons = products_from_service.map(product => ({
                        ...product,
                        icon: React.createElement(iconOptions.find(option => option.value === product.selectedIcon)?.icon || BeerIcon)
                    }))
                    setProducts(productsWithIcons)
                    
                    // Si recibimos productos, es que el backend está conectado
                    if (products_from_service.length > 0) {
                        setBackendConnected(true);
                    }
                } catch (error) {
                    console.error("Error initializing products:", error);
                    setBackendConnected(false);
                }
            }
        }
        const initializeOrderHistory = async () => {
                const orderHistory_from_service = await _orderService.getOrders();
                setOrderHistory(orderHistory_from_service)
        }
        initializeProduts(products).then((products) => {
            console.log("result")
            console.log(products)

        }).catch((error) => {
            console.log(error)

        })

        initializeCategories().then((categories) => {
            console.log("result")
            console.log(categories)

        }).catch((error) => {
            console.log(error)

        })

        initializeOrderHistory().then((orderHistory) => {
            console.log("result")
            console.log(orderHistory)

        }).catch((error) => {
            console.log(error)

        })
        if (users.length === 0) {
            setUsers([
                {
                    id: 1,
                    name: 'Germán',
                    profilePicture: '/panxo.svg',
                    pin: "1111",
                    pinnedProductIds: [1, 2, 3, 4, 5, 6]
                },
                {id: 2, name: 'Marta', profilePicture: '/nuka.svg', pin: "1234", pinnedProductIds: [1, 2, 3]}
            ])
        }

        if (tables.length === 0) {
            setTables([
                {id: 0, name: 'Barra', available: true},
                {id: 1, name: 'Mesa 1', available: true},
                {id: 2, name: 'Mesa 2', available: true},
                {id: 3, name: 'Mesa 3', available: true},
                {id: 4, name: 'Mesa 4', available: true},
                {id: 5, name: 'Mesa 5', available: true},
                {id: 6, name: 'Mesa 6', available: true},
                {id: 7, name: 'Mesa 7', available: true},
                {id: 8, name: 'Mesa 8', available: true},
                {id: 9, name: 'Mesa 9', available: true},
            ])
        }


        if (!thermalPrinterOptions) {
            setThermalPrinterOptions({
                type: PrinterTypes.EPSON,
                interface: '//COM3',
                characterSet: CharacterSet.PC852_LATIN2,
                removeSpecialCharacters: false,
                lineCharacter: '-',
                breakLine: BreakLine.WORD,
                options: {timeout: 3000},
            })
        }

    }, [])

    const menuItems = [
        {id: 'home', icon: <HomeIcon/>, label: 'Inicio'},
        {id: 'products', icon: <ClipboardListIcon/>, label: 'Productos'},
        {id: 'newOrder', icon: <PlusCircleIcon/>, label: 'Nueva Comanda'},
        {id: 'orderHistory', icon: <HistoryIcon/>, label: 'Historial'},
        {id: 'settings', icon: <SettingsIcon/>, label: 'Ajustes'},
    ]



    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen)

    useEffect(() => {
        const previousSection = prevSectionRef.current
        console.log('🔄 SECTION CHANGE:', {
            from: previousSection,
            to: activeSection,
            isMobile,
            timestamp: new Date().toLocaleTimeString()
        })
        prevSectionRef.current = activeSection
    }, [activeSection, isMobile])
    const pageVariants = {
        enter: (direction: {axis: 'x' | 'y', value: number}) => {
            let enterValue: string
            
            if (direction.axis === 'x') {
                // MÓVIL - Horizontal (left/right movement)
                enterValue = direction.value > 0 ? '100%' : '-100%'  // Forward: desde derecha, Backward: desde izquierda
            } else {
                // DESKTOP - Vertical (up/down movement)
                enterValue = direction.value > 0 ? '50vh' : '-50vh'  // Forward: desde abajo, Backward: desde arriba (using vh for clarity)
            }
            
            console.log('📥 ENTER ANIMATION:', {
                axis: direction.axis,
                value: direction.value,
                enterValue,
                isForward: direction.value > 0,
                device: direction.axis === 'x' ? 'MOBILE' : 'DESKTOP'
            })
            
            return {
                [direction.axis]: enterValue,
                opacity: 0,
                scale: 0.95, // Add subtle scale effect
            }
        },
        center: {
            x: 0,
            y: 0,
            opacity: 1,
            scale: 1,
        },
        exit: (direction: {axis: 'x' | 'y', value: number}) => {
            let exitValue: string
            
            if (direction.axis === 'x') {
                // MÓVIL - Horizontal (left/right movement)
                exitValue = direction.value > 0 ? '-100%' : '100%'  // Forward: sale izquierda, Backward: sale derecha
            } else {
                // DESKTOP - Vertical (up/down movement)  
                exitValue = direction.value > 0 ? '-50vh' : '50vh'  // Forward: sale arriba, Backward: sale abajo (using vh for clarity)
            }
            
            console.log('📤 EXIT ANIMATION:', {
                axis: direction.axis,
                value: direction.value,
                exitValue,
                isForward: direction.value > 0,
                device: direction.axis === 'x' ? 'MOBILE' : 'DESKTOP'
            })
            
            return {
                [direction.axis]: exitValue,
                opacity: 0,
                scale: 0.95, // Add subtle scale effect
            }
        },
    }

    const pageTransition = {
        type: 'tween',
        ease: [0.4, 0, 0.2, 1], // Better easing curve
        duration: isMobile ? 0.35 : 0.4, // Faster on mobile
    }


    const getDirection = useCallback((current: string) => {
        const previous = prevSectionRef.current
        const menuOrder = ['home', 'products', 'newOrder', 'orderHistory', 'settings']
        const currentIndex = menuOrder.indexOf(current)
        const previousIndex = menuOrder.indexOf(previous)
        
        // Fix: Handle equal case properly
        const direction = currentIndex === previousIndex 
            ? 0  // No movement when same section
            : currentIndex > previousIndex ? 1 : -1
        
        const result = {
            axis: isMobile ? 'x' as const : 'y' as const,
            value: direction
        }
        
        // Debug logging
        if (direction !== 0) {
            console.log('🎯 TRANSITION DEBUG:', {
                current,
                previous,
                currentIndex,
                previousIndex,
                direction: direction > 0 ? 'FORWARD' : 'BACKWARD',
                isMobile,
                axis: result.axis,
                finalDirection: result.value
            })
        }
        
        return result
    }, [isMobile])


    return (
        <div className={cn(
            "flex h-screen w-screen bg-background text-foreground overscroll-none",
            isMobile ? "pb-20 pt-0 px-0" : "pt-4 pr-4 pb-4", // Add bottom padding for mobile nav
            touchOptimizationsEnabled && "touch-optimized"
        )}>
            <Toaster/>

            {/* Main Content */}
            {!selectedUser ? <AnimatePresence>
                <motion.div
                    key="login"
                    custom={getDirection(activeSection)}
                    variants={pageVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={pageTransition}
                    className="absolute inset-0 bg-transparent"
                >
                    <Login users={users} onLogin={setSelectedUser}/>
                </motion.div>
            </AnimatePresence> : <>
                <Sidebar
                    isSidebarOpen={isSidebarOpen}
                    activeSection={activeSection}
                    setActiveSection={setActiveSection}
                    isDarkMode={mode === 'dark'}
                    toggleDarkMode={toggleDarkMode}
                    menuItems={menuItems}
                    loggedUser={selectedUser}
                    onLogout={() => setSelectedUser(null)}
                />

                {/* Sidebar Toggle Button - Hide on mobile */}
                {!isMobile && (
                    <SidebarToggleButton
                        isSidebarOpen={isSidebarOpen}
                        toggleSidebar={toggleSidebar}
                    />
                )}
                
                <main className={cn(
                    "flex-1 h-full relative overscroll-y-none",
                    isMobile && "w-full"
                )}>
                    <AnimatePresence custom={getDirection(activeSection)}>
                        <motion.div
                            key={activeSection}
                            custom={getDirection(activeSection)}
                            variants={pageVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={pageTransition}
                            className="absolute inset-0 rounded-3xl overflow-hidden"
                        >
                            <Card className={cn(
                                "h-full w-full bg-card border-card-border shadow-xl overflow-hidden",
                                isMobile ? "rounded-none border-0" : "rounded-3xl"
                            )}>
                                <CardContent className="p-0 h-full flex flex-col overflow-hidden bg-card text-card-foreground">
                                    <div className={cn(
                                        "flex-shrink-0",
                                        isMobile ? "px-4 pt-4" : "px-2 sm:px-6 pt-2 sm:pt-6"
                                    )}>
                                        <SectionHeader menuItems={menuItems} activeSection={activeSection}/>
                                    </div>

                                    {/*SECTIONS */}

                                    <div className="flex-1 overflow-hidden">
                                        {/* Home Section */}
                                        {activeSection === 'home' && (
                                            <div className={cn(
                                                "h-full overflow-y-auto",
                                                isMobile ? "px-4 pb-4" : "px-2 sm:px-6 pb-2 sm:pb-6"
                                            )}>
                                                <Home userName={selectedUser?.name || 'Usuario desconocido'}/>
                                            </div>
                                        )}
                                        {/* Products Section */}
                                        {activeSection === 'products' && (
                                            <div className={cn(
                                                "h-full overflow-y-auto",
                                                isMobile ? "px-4 pb-4" : "px-2 sm:px-6 pb-2 sm:pb-6"
                                            )}>
                                                <Products />
                                            </div>
                                        )}
                                        {/* NewOrder Section - No padding for mobile layout */}
                                        {activeSection === 'newOrder' && (
                                            <div className={isMobile ? "h-full" : ""}>
                                                <NewOrder />
                                            </div>
                                        )}
                                        {activeSection === 'orderHistory' && (
                                            <div className={cn(
                                                "h-full overflow-y-auto",
                                                isMobile ? "px-4 pb-4" : "px-2 sm:px-6 pb-2 sm:pb-6"
                                            )}>
                                                <OrderHistory
                                                              setSelectedOrderId={setSelectedOrderId}
                                                              setActiveSection={setActiveSection} selectedOrder={selectedOrder}
                                                              setSelectedOrder={setSelectedOrder}/>
                                            </div>
                                        )}
                                        {(activeSection === 'settings' && selectedUser) && (
                                            <div className={cn(
                                                "h-full overflow-y-auto",
                                                isMobile ? "px-4 pb-4" : "px-2 sm:px-6 pb-2 sm:pb-6"
                                            )}>
                                                <SettingsPanel users={users} selectedUser={selectedUser}
                                                               handleThermalPrinterOptionsChange={handleThermalPrinterOptionsChange}
                                                               thermalPrinterOptions={thermalPrinterOptions as ThermalPrinterServiceOptions}
                                                               isDarkMode={mode === 'dark'} toggleDarkMode={toggleDarkMode}
                                                               isSidebarOpen={isSidebarOpen} setSelectedUser={setSelectedUser}
                                                               setUsers={setUsers}/>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </AnimatePresence>
                </main>

                {/* Bottom Navigation for Mobile */}
                {isMobile && (
                    <BottomNavigation
                        activeSection={activeSection}
                        setActiveSection={setActiveSection}
                        menuItems={menuItems}
                        loggedUser={selectedUser}
                        onLogout={() => setSelectedUser(null)}
                    />
                )}
            </>}

            {/* Debug Indicator */}
            {debugMode && <DebugIndicator />}
        </div>
    )
}

export default App