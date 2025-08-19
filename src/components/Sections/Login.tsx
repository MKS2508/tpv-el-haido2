import {useCallback, useEffect, useState} from 'react'
import {motion, AnimatePresence} from 'framer-motion'
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import User from "@/models/User"
import {Loader2} from "lucide-react"
import { useResponsive } from "@/hooks/useResponsive"
import { isTauriEnvironment } from "@/utils/environment"

interface LoginProps {
    users: User[]
    onLogin: (user: User) => void
}

const Login = ({ users, onLogin }: LoginProps) => {
    const [selectedUser, setSelectedUser] = useState<User | null>(null)
    const [pin, setPin] = useState('')
    const [error, setError] = useState('')
    const [currentTime, setCurrentTime] = useState(new Date())
    const [isLoading, setIsLoading] = useState(false)
    const [isTauri, setIsTauri] = useState(false)
    const { isMobile, isLaptop, isDesktop, isLargeDesktop, isUltraWide } = useResponsive()
    
    // Helper to determine if we should use desktop layout
    const isDesktopLayout = isLaptop || isDesktop || isLargeDesktop || isUltraWide

    // Check if we're in Tauri environment after component mounts
    useEffect(() => {
        const checkTauriEnvironment = () => {
            const isInTauri = typeof window !== 'undefined' && (
                (window as any).__TAURI__ !== undefined ||
                (window as any).__TAURI_IPC__ !== undefined ||
                window.location.protocol === 'tauri:' ||
                // Additional check for Tauri v2
                (window as any).__TAURI_INVOKE__ !== undefined ||
                // Check if running in Tauri webview (common user agent patterns)
                (window.navigator.userAgent.includes('Tauri') || 
                 window.navigator.userAgent.includes('tauri'))
            )
            
            console.log('🔍 Checking Tauri environment:', {
                __TAURI__: !!(window as any).__TAURI__,
                __TAURI_IPC__: !!(window as any).__TAURI_IPC__,
                __TAURI_INVOKE__: !!(window as any).__TAURI_INVOKE__,
                protocol: window.location.protocol,
                userAgent: window.navigator.userAgent,
                userAgentIncludesTauri: window.navigator.userAgent.includes('Tauri') || window.navigator.userAgent.includes('tauri'),
                isInTauri
            })
            
            setIsTauri(isInTauri)
        }
        
        checkTauriEnvironment()
        
        // Check again after a short delay to ensure Tauri APIs are loaded
        const timeoutId = setTimeout(checkTauriEnvironment, 500)
        
        return () => clearTimeout(timeoutId)
    }, [])

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000)
        return () => clearInterval(timer)
    }, [])

    useEffect(() => {
        if (pin.length === 4) {
            handlePinSubmit()
        }
    }, [pin])

    const handleUserSelect = (user: User) => {
        setSelectedUser(user)
        setPin('')
        setError('')
    }

    const handlePinSubmit = () => {
        if (selectedUser && pin === selectedUser.pin) {
            setIsLoading(true)
            setTimeout(() => {
                setIsLoading(false)
                onLogin(selectedUser)
            }, 2000)
        } else {
            setError('PIN incorrecto')
            setPin('')
        }
    }

    const handlePinInput = (digit: string) => {
        if (pin.length < 4) {
            setPin(prevPin => prevPin + digit)
        }
    }

    const handlePinDelete = () => {
        setPin(prevPin => prevPin.slice(0, -1))
    }

    const handleKeyPress = useCallback((event: KeyboardEvent) => {
        if (!selectedUser) return;

        const key = event.key;
        if (/^[0-9]$/.test(key)) {
            event.preventDefault();
            handlePinInput(key);
        } else if (key === 'Backspace') {
            event.preventDefault();
            handlePinDelete();
        } else if (key === 'Enter') {
            event.preventDefault();
            handlePinSubmit();
        }
    }, [selectedUser, handlePinInput, handlePinDelete, handlePinSubmit]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyPress);
        return () => {
            window.removeEventListener('keydown', handleKeyPress);
        };
    }, [handleKeyPress]);

    const renderNumpad = () => {
        const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'delete', '0']
        return (
            <div className={`grid grid-cols-3 gap-2 mx-auto ${
                isDesktopLayout ? 'max-w-[240px] lg:max-w-[280px]' : 'gap-3 max-w-xs'
            }`}>
                {digits.map((digit, index) => (
                    <div key={index}>
                        <Button
                            onClick={() => {
                                if (digit === 'delete') handlePinDelete()
                                else handlePinInput(digit)
                            }}
                            variant="outline"
                            className={`w-full font-semibold bg-white/50 dark:bg-gray-800/50 hover:bg-white/70 dark:hover:bg-gray-700/70 border-gray-300/50 dark:border-gray-600/50 transition-all hover:scale-105 active:scale-95 touch-manipulation ${
                                isDesktopLayout 
                                    ? 'h-12 lg:h-14 text-lg lg:text-xl' // Smaller for desktop to fit better
                                    : isMobile 
                                        ? 'h-16 text-xl' 
                                        : 'h-16 text-xl sm:text-2xl'
                            }`}
                        >
                            {digit === 'delete' ? '⌫' : digit}
                        </Button>
                    </div>
                ))}
            </div>
        )
    }

    if (isLoading) {
        return (
            <div
                className="h-screen w-screen flex flex-col items-center justify-center p-4 bg-cover bg-center bg-fixed"
                style={{ backgroundImage: "url('/wallpaper.jpeg')" }}
            >
                <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/70 z-0" />
                <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="z-10 bg-white/70 dark:bg-gray-900/70 rounded-full p-8 shadow-2xl border border-white/20"
                >
                    <Loader2 className="animate-spin text-primary w-12 h-12" />
                </motion.div>
            </div>
        )
    }

    return (
        <div
            className="h-screen w-screen flex flex-col items-center justify-center p-4 bg-cover bg-center bg-fixed"
            style={{ backgroundImage: "url('/wallpaper.jpeg')" }}
        >
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/70 z-0" />
            
            <div className="z-10 flex flex-col items-center justify-center w-full">
                {/* Main Container - Fixed size, truly transparent */}
                <motion.div
                    layout
                    initial={{ opacity: 0, y: 30, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ 
                        duration: 0.5, 
                        ease: [0.4, 0, 0.2, 1]
                    }}
                    className={`bg-white/70 dark:bg-gray-900/70 border border-white/20 dark:border-gray-700/30 rounded-3xl shadow-2xl w-[90vw] max-w-3xl overflow-hidden flex flex-col ${
                        isMobile 
                            ? 'p-4 min-h-[70vh] max-h-[95vh] h-auto' // More padding and height for mobile
                            : 'p-6 sm:p-8 h-[85vh] max-h-[700px]'
                    }`}
                >
                    {/* Logo inside container */}
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2, duration: 0.4 }}
                        className="flex justify-center mb-4"
                    >
                        <img src="/logo.svg" alt="El Haido Logo" className={isMobile ? "w-10 h-10" : "w-20 h-20 sm:w-24 sm:h-24"} />
                    </motion.div>

                    {/* Title and Time */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3, duration: 0.4 }}
                        className={`text-center ${isMobile ? 'mb-2' : 'mb-4'}`}
                    >
                        <h1 className={isMobile ? "text-xl font-bold text-gray-900 dark:text-white" : "text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white"}>
                            El Haido TPV
                        </h1>
                        <p className={`text-gray-700 dark:text-gray-300 mt-1 font-medium ${isMobile ? 'text-xs' : 'text-sm'}`}>
                            {currentTime.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit', second: '2-digit'})}
                        </p>
                    </motion.div>
                    
                    {/* Dynamic subtitle */}
                    <motion.h2 
                        key={selectedUser ? 'selected' : 'not-selected'}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.3 }}
                        className={`font-semibold text-center text-gray-800 dark:text-gray-200 ${
                            isMobile ? 'text-base mb-4' : 'text-lg sm:text-xl mb-6'
                        }`}
                    >
                        {selectedUser ? `Hola, ${selectedUser.name}` : 'Selecciona tu usuario'}
                    </motion.h2>

                    {/* Content area with fixed height */}
                    <div className="flex-1 flex items-center justify-center overflow-hidden">
                        <AnimatePresence mode="wait">
                            {!selectedUser ? (
                                <motion.div
                                    key="user-selection"
                                    initial={{ opacity: 0, x: -30 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 30 }}
                                    transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                                    className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 w-full max-w-lg"
                                >
                                    {users.map((user) => (
                                        <div
                                            key={user.id}
                                            onClick={() => handleUserSelect(user)}
                                            className="user-card flex flex-col items-center cursor-pointer p-4 rounded-2xl"
                                        >
                                            <Avatar className="w-32 h-32 sm:w-40 sm:h-40 ring-4 ring-white/50 dark:ring-gray-700/50 hover:ring-primary/50 transition-all shadow-xl">
                                                <AvatarImage src={user.profilePicture} alt={user.name}/>
                                                <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-white text-xl sm:text-2xl font-bold">
                                                    {user.name.charAt(0)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <p className="mt-3 text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                                                {user.name}
                                            </p>
                                        </div>
                                    ))}
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="pin-input"
                                    initial={{ opacity: 0, x: 30 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -30 }}
                                    transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                                    className={`w-full ${
                                        isDesktopLayout 
                                            ? 'max-w-4xl' // Wider container for desktop
                                            : isMobile ? 'max-w-sm' : 'max-w-md'
                                    }`}
                                >
                                    {isDesktopLayout ? (
                                        // Desktop Layout - Horizontal Two Columns
                                        <div className="flex items-center justify-center gap-6 lg:gap-8 w-full">
                                            {/* Left Column - User Info */}
                                            <motion.div 
                                                initial={{ opacity: 0, x: -30 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ duration: 0.3, delay: 0.1 }}
                                                className="flex-1 max-w-xs flex flex-col items-center space-y-3"
                                            >
                                                <Avatar className="w-24 h-24 lg:w-28 lg:h-28 ring-4 ring-primary/30 shadow-xl">
                                                    <AvatarImage src={selectedUser.profilePicture} alt={selectedUser.name}/>
                                                    <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-white text-xl lg:text-2xl font-bold">
                                                        {selectedUser.name.charAt(0)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="text-center space-y-1">
                                                    <p className="text-xl lg:text-2xl font-semibold text-gray-900 dark:text-white">
                                                        {selectedUser.name}
                                                    </p>
                                                    <p className="text-gray-600 dark:text-gray-400 text-xs lg:text-sm">
                                                        Introduce tu PIN de seguridad
                                                    </p>
                                                </div>
                                            </motion.div>
                                            
                                            {/* Right Column - PIN Input */}
                                            <motion.div 
                                                initial={{ opacity: 0, x: 30 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ duration: 0.3, delay: 0.2 }}
                                                className="flex-1 max-w-xs flex flex-col items-center space-y-4"
                                            >
                                                {/* PIN dots */}
                                                <motion.div 
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    transition={{ delay: 0.3, duration: 0.3 }}
                                                    className="flex justify-center"
                                                >
                                                    <div className="flex space-x-3">
                                                        {[...Array(4)].map((_, index) => (
                                                            <motion.div 
                                                                key={index} 
                                                                initial={{ scale: 0 }}
                                                                animate={{ scale: 1 }}
                                                                transition={{ delay: (index * 0.05) + 0.3, duration: 0.2 }}
                                                                className="w-3 h-3 lg:w-4 lg:h-4 rounded-full border-2 border-gray-400/50 dark:border-gray-600/50 bg-white/30 dark:bg-gray-800/30"
                                                            >
                                                                <AnimatePresence>
                                                                    {pin.length > index && (
                                                                        <motion.div 
                                                                            initial={{ scale: 0 }}
                                                                            animate={{ scale: 1 }}
                                                                            exit={{ scale: 0 }}
                                                                            transition={{ duration: 0.15 }}
                                                                            className="w-full h-full rounded-full bg-primary"
                                                                        />
                                                                    )}
                                                                </AnimatePresence>
                                                            </motion.div>
                                                        ))}
                                                    </div>
                                                </motion.div>
                                                
                                                {/* Error message */}
                                                <AnimatePresence>
                                                    {error && (
                                                        <motion.p
                                                            initial={{ opacity: 0, y: -10 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            exit={{ opacity: 0, y: -10 }}
                                                            className="text-red-500 text-center font-medium text-xs lg:text-sm"
                                                        >
                                                            {error}
                                                        </motion.p>
                                                    )}
                                                </AnimatePresence>
                                                
                                                {/* Numpad */}
                                                <motion.div 
                                                    initial={{ opacity: 0, y: 20 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: 0.4, duration: 0.3 }}
                                                    className="w-full"
                                                >
                                                    {renderNumpad()}
                                                </motion.div>
                                            </motion.div>
                                        </div>
                                    ) : (
                                        // Mobile/Tablet Layout - Vertical Single Column
                                        <div className={`${isMobile ? 'space-y-3' : 'space-y-4 sm:space-y-6'}`}>
                                            {/* User avatar - smaller in PIN view */}
                                            <motion.div 
                                                initial={{ scale: 0.5, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                transition={{ duration: 0.3 }}
                                                className="flex flex-col items-center"
                                            >
                                                <Avatar className={`ring-4 ring-primary/30 shadow-xl ${
                                                    isMobile ? 'w-14 h-14' : 'w-24 h-24 sm:w-32 sm:h-32'
                                                }`}>
                                                    <AvatarImage src={selectedUser.profilePicture} alt={selectedUser.name}/>
                                                    <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-white text-lg sm:text-xl font-bold">
                                                        {selectedUser.name.charAt(0)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <p className={`font-semibold text-gray-900 dark:text-white ${
                                                    isMobile ? 'mt-1 text-sm' : 'mt-3 text-lg sm:text-xl'
                                                }`}>
                                                    {selectedUser.name}
                                                </p>
                                                <p className={`text-gray-600 dark:text-gray-400 mt-1 ${
                                                    isMobile ? 'text-xs' : 'text-xs sm:text-sm'
                                                }`}>
                                                    Introduce tu PIN
                                                </p>
                                            </motion.div>
                                            
                                            {/* PIN dots */}
                                            <motion.div 
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                transition={{ delay: 0.1, duration: 0.3 }}
                                                className="flex justify-center"
                                            >
                                                <div className="flex space-x-3">
                                                    {[...Array(4)].map((_, index) => (
                                                        <motion.div 
                                                            key={index} 
                                                            initial={{ scale: 0 }}
                                                            animate={{ scale: 1 }}
                                                            transition={{ delay: index * 0.05, duration: 0.2 }}
                                                            className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 border-gray-400/50 dark:border-gray-600/50 bg-white/30 dark:bg-gray-800/30"
                                                        >
                                                            <AnimatePresence>
                                                                {pin.length > index && (
                                                                    <motion.div 
                                                                        initial={{ scale: 0 }}
                                                                        animate={{ scale: 1 }}
                                                                        exit={{ scale: 0 }}
                                                                        transition={{ duration: 0.15 }}
                                                                        className="w-full h-full rounded-full bg-primary"
                                                                    />
                                                                )}
                                                            </AnimatePresence>
                                                        </motion.div>
                                                    ))}
                                                </div>
                                            </motion.div>
                                            
                                            {/* Error message */}
                                            <AnimatePresence>
                                                {error && (
                                                    <motion.p
                                                        initial={{ opacity: 0, y: -10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, y: -10 }}
                                                        className="text-red-500 text-center font-medium text-sm"
                                                    >
                                                        {error}
                                                    </motion.p>
                                                )}
                                            </AnimatePresence>
                                            
                                            {/* Numpad - responsive */}
                                            <motion.div 
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.2, duration: 0.3 }}
                                            >
                                                {renderNumpad()}
                                            </motion.div>
                                        </div>
                                    )}
                                    
                                    {/* Back button - Always at bottom */}
                                    <motion.div 
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.5, duration: 0.3 }}
                                        className={`flex justify-center ${isDesktopLayout ? 'mt-8' : 'mt-4'}`}
                                    >
                                        <Button 
                                            variant="ghost" 
                                            onClick={() => setSelectedUser(null)}
                                            className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-white/20 dark:hover:bg-gray-800/20"
                                        >
                                            ← Cambiar usuario
                                        </Button>
                                    </motion.div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>

                {/* Fullscreen button - outside container - Only on desktop and web */}
                {!isMobile && !isTauri && typeof window !== 'undefined' && !window.location.href.includes('tauri') && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.5 }}
                        className="mt-6"
                    >
                        <Button
                            variant="secondary"
                            onClick={async () => {
                                if (document.fullscreenElement) {
                                    await document.exitFullscreen();
                                } else {
                                    await document.documentElement.requestFullscreen();
                                }
                            }}
                            className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm text-gray-700 dark:text-gray-300 hover:bg-white/80 dark:hover:bg-gray-800/80 shadow-lg border border-white/20"
                        >
                            Pantalla completa
                        </Button>
                    </motion.div>
                )}
            </div>
        </div>
    )
}

export default Login