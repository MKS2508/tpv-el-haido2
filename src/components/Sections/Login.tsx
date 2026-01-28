import { createEffect, createSignal, onCleanup, onMount, Show, For, type JSX } from 'solid-js';
import { Presence, Motion } from '@motionone/solid';
import { Loader2 } from 'lucide-solid';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useResponsive } from '@/hooks/useResponsive';
import type User from '@/models/User';

interface LoginProps {
  users: User[];
  onLogin: (user: User) => void;
}

const Login = (props: LoginProps) => {
  const [selectedUser, setSelectedUser] = createSignal<User | null>(null);
  const [pin, setPin] = createSignal('');
  const [error, setError] = createSignal('');
  const [currentTime, setCurrentTime] = createSignal(new Date());
  const [isLoading, setIsLoading] = createSignal(false);
  const [isTauri, setIsTauri] = createSignal(false);
  const responsive = useResponsive();

  // Helper to determine if we should use desktop layout
  const isDesktopLayout = () =>
    responsive.isLaptop || responsive.isDesktop || responsive.isLargeDesktop || responsive.isUltraWide;

  // Define handlers
  const handlePinInput = (digit: string) => {
    setPin((prevPin) => (prevPin.length < 4 ? prevPin + digit : prevPin));
  };

  const handlePinDelete = () => {
    setPin((prevPin) => prevPin.slice(0, -1));
  };

  const handlePinSubmit = () => {
    const user = selectedUser();
    if (user && pin() === user.pin) {
      setIsLoading(true);
      setTimeout(() => {
        setIsLoading(false);
        props.onLogin(user);
      }, 2000);
    } else {
      setError('PIN incorrecto');
      setPin('');
    }
  };

  const handleUserSelect = (user: User) => {
    setSelectedUser(user);
    setPin('');
    setError('');
  };

  const handleKeyPress = (event: KeyboardEvent) => {
    if (!selectedUser()) return;

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
  };

  // Check if we're in Tauri environment after component mounts
  onMount(() => {
    const checkTauriEnvironment = () => {
      const isInTauri =
        typeof window !== 'undefined' &&
        ((window as unknown as { __TAURI__?: unknown }).__TAURI__ !== undefined ||
          (window as unknown as { __TAURI_IPC__?: unknown }).__TAURI_IPC__ !== undefined ||
          window.location.protocol === 'tauri:' ||
          // Additional check for Tauri v2
          (window as unknown as { __TAURI_INVOKE__?: unknown }).__TAURI_INVOKE__ !== undefined ||
          // Check if running in Tauri webview (common user agent patterns)
          window.navigator.userAgent.includes('Tauri') ||
          window.navigator.userAgent.includes('tauri'));

      setIsTauri(isInTauri);
    };

    checkTauriEnvironment();

    // Check again after a short delay to ensure Tauri APIs are loaded
    const timeoutId = setTimeout(checkTauriEnvironment, 500);

    onCleanup(() => clearTimeout(timeoutId));
  });

  onMount(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    onCleanup(() => clearInterval(timer));
  });

  createEffect(() => {
    if (pin().length === 4) {
      handlePinSubmit();
    }
  });

  createEffect(() => {
    window.addEventListener('keydown', handleKeyPress);

    onCleanup(() => {
      window.removeEventListener('keydown', handleKeyPress);
    });
  });

  const renderNumpad = (): JSX.Element => {
    const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'delete', '0'];
    return (
      <div
        class={`grid grid-cols-3 gap-2 mx-auto ${
          isDesktopLayout() ? 'max-w-[240px] lg:max-w-[280px]' : 'gap-3 max-w-xs'
        }`}
      >
        <For each={digits}>
          {(digit) => (
            <div>
              <Button
                onClick={() => {
                  if (digit === 'delete') handlePinDelete();
                  else handlePinInput(digit);
                }}
                variant="outline"
                class={`w-full font-semibold bg-white/50 dark:bg-gray-800/50 hover:bg-white/70 dark:hover:bg-gray-700/70 border-gray-300/50 dark:border-gray-600/50 transition-all hover:scale-105 active:scale-95 touch-manipulation ${
                  isDesktopLayout()
                    ? 'h-12 lg:h-14 text-lg lg:text-xl' // Smaller for desktop to fit better
                    : responsive.isMobile
                      ? 'h-16 text-xl'
                      : 'h-16 text-xl sm:text-2xl'
                }`}
              >
                {digit === 'delete' ? '\u232B' : digit}
              </Button>
            </div>
          )}
        </For>
      </div>
    );
  };

  const renderPinDots = (dotSize: string): JSX.Element => {
    const indices = [0, 1, 2, 3];
    return (
      <div class="flex justify-center">
        <div class="flex space-x-3">
          <For each={indices}>
            {(index) => (
              <Motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: index * 0.05, duration: 0.2 }}
                class={`${dotSize} rounded-full border-2 border-gray-400/50 dark:border-gray-600/50 bg-white/30 dark:bg-gray-800/30`}
              >
                <Presence>
                  <Show when={pin().length > index}>
                    <Motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      transition={{ duration: 0.15 }}
                      class="w-full h-full rounded-full bg-primary"
                    />
                  </Show>
                </Presence>
              </Motion.div>
            )}
          </For>
        </div>
      </div>
    );
  };

  return (
    <Show
      when={!isLoading()}
      fallback={
        <div
          class="h-screen w-screen flex flex-col items-center justify-center p-4 bg-cover bg-center bg-fixed"
          style={{ "background-image": "url('/wallpaper.jpeg')" }}
        >
          <div class="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/70 z-0" />
          <Motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            class="z-10 bg-white/70 dark:bg-gray-900/70 rounded-full p-8 shadow-2xl border border-white/20"
          >
            <Loader2 class="animate-spin text-primary w-12 h-12" />
          </Motion.div>
        </div>
      }
    >
      <div
        class="h-screen w-screen flex flex-col items-center justify-center p-4 bg-cover bg-center bg-fixed"
        style={{ "background-image": "url('/wallpaper.jpeg')" }}
      >
        <div class="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/70 z-0" />
        <div class="z-10 flex flex-col items-center justify-center w-full">
          {/* Main Container - Fixed size, truly transparent */}
          <Motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              duration: 0.5,
              easing: [0.4, 0, 0.2, 1],
            }}
            class={`bg-white/70 dark:bg-gray-900/70 border border-white/20 dark:border-gray-700/30 rounded-3xl shadow-2xl w-[90vw] max-w-3xl overflow-hidden flex flex-col ${
              responsive.isMobile
                ? 'p-4 min-h-[70vh] max-h-[95vh] h-auto' // More padding and height for mobile
                : 'p-6 sm:p-8 h-[85vh] max-h-[700px]'
            }`}
          >
            {/* Logo inside container */}
            <Motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              class="flex justify-center mb-4"
            >
              <img
                src="/logo.svg"
                alt="El Haido Logo"
                class={responsive.isMobile ? 'w-10 h-10' : 'w-20 h-20 sm:w-24 sm:h-24'}
              />
            </Motion.div>

            {/* Title and Time */}
            <Motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              class={`text-center ${responsive.isMobile ? 'mb-2' : 'mb-4'}`}
            >
              <h1
                class={
                  responsive.isMobile
                    ? 'text-xl font-bold text-gray-900 dark:text-white'
                    : 'text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white'
                }
              >
                El Haido TPV
              </h1>
              <p
                class={`text-gray-700 dark:text-gray-300 mt-1 font-medium ${responsive.isMobile ? 'text-xs' : 'text-sm'}`}
              >
                {currentTime().toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </p>
            </Motion.div>

            {/* Dynamic subtitle */}
            <Motion.h2
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              class={`font-semibold text-center text-gray-800 dark:text-gray-200 ${
                responsive.isMobile ? 'text-base mb-4' : 'text-lg sm:text-xl mb-6'
              }`}
            >
              {selectedUser() ? `Hola, ${selectedUser()!.name}` : 'Selecciona tu usuario'}
            </Motion.h2>

            {/* Content area with fixed height */}
            <div class="flex-1 flex items-center justify-center overflow-hidden">
              <Presence exitBeforeEnter>
                <Show
                  when={selectedUser()}
                  fallback={
                    <Motion.div
                      initial={{ opacity: 0, x: -30 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 30 }}
                      transition={{ duration: 0.3, easing: [0.4, 0, 0.2, 1] }}
                      class="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 w-full max-w-lg"
                    >
                      <For each={props.users}>
                        {(user) => (
                          <button
                            type="button"
                            onClick={() => handleUserSelect(user)}
                            class="user-card flex flex-col items-center cursor-pointer p-4 rounded-2xl bg-transparent border-none"
                          >
                            <Avatar class="w-32 h-32 sm:w-40 sm:h-40 ring-4 ring-white/50 dark:ring-gray-700/50 hover:ring-primary/50 transition-all shadow-xl">
                              <AvatarImage src={user.profilePicture} alt={user.name} />
                              <AvatarFallback class="bg-gradient-to-br from-primary to-primary/70 text-white text-xl sm:text-2xl font-bold">
                                {user.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <p class="mt-3 text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                              {user.name}
                            </p>
                          </button>
                        )}
                      </For>
                    </Motion.div>
                  }
                >
                  {(user) => (
                    <Motion.div
                      initial={{ opacity: 0, x: 30 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -30 }}
                      transition={{ duration: 0.3, easing: [0.4, 0, 0.2, 1] }}
                      class={`w-full ${
                        isDesktopLayout()
                          ? 'max-w-4xl' // Wider container for desktop
                          : responsive.isMobile
                            ? 'max-w-sm'
                            : 'max-w-md'
                      }`}
                    >
                      <Show
                        when={isDesktopLayout()}
                        fallback={
                          // Mobile/Tablet Layout - Vertical Single Column
                          <div class={`${responsive.isMobile ? 'space-y-3' : 'space-y-4 sm:space-y-6'}`}>
                            {/* User avatar - smaller in PIN view */}
                            <Motion.div
                              initial={{ scale: 0.5, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ duration: 0.3 }}
                              class="flex flex-col items-center"
                            >
                              <Avatar
                                class={`ring-4 ring-primary/30 shadow-xl ${
                                  responsive.isMobile ? 'w-14 h-14' : 'w-24 h-24 sm:w-32 sm:h-32'
                                }`}
                              >
                                <AvatarImage src={user().profilePicture} alt={user().name} />
                                <AvatarFallback class="bg-gradient-to-br from-primary to-primary/70 text-white text-lg sm:text-xl font-bold">
                                  {user().name.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <p
                                class={`font-semibold text-gray-900 dark:text-white ${
                                  responsive.isMobile ? 'mt-1 text-sm' : 'mt-3 text-lg sm:text-xl'
                                }`}
                              >
                                {user().name}
                              </p>
                              <p
                                class={`text-gray-600 dark:text-gray-400 mt-1 ${
                                  responsive.isMobile ? 'text-xs' : 'text-xs sm:text-sm'
                                }`}
                              >
                                Introduce tu PIN
                              </p>
                            </Motion.div>
                            {/* PIN dots */}
                            <Motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: 0.1, duration: 0.3 }}
                            >
                              {renderPinDots('w-5 h-5 sm:w-6 sm:h-6')}
                            </Motion.div>
                            {/* Error message */}
                            <Presence>
                              <Show when={error()}>
                                <Motion.p
                                  initial={{ opacity: 0, y: -10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -10 }}
                                  class="text-red-500 text-center font-medium text-sm"
                                >
                                  {error()}
                                </Motion.p>
                              </Show>
                            </Presence>
                            {/* Numpad - responsive */}
                            <Motion.div
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.2, duration: 0.3 }}
                            >
                              {renderNumpad()}
                            </Motion.div>
                          </div>
                        }
                      >
                        {/* Desktop Layout - Horizontal Two Columns */}
                        <div class="flex items-center justify-center gap-6 lg:gap-8 w-full">
                          {/* Left Column - User Info */}
                          <Motion.div
                            initial={{ opacity: 0, x: -30 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: 0.1 }}
                            class="flex-1 max-w-xs flex flex-col items-center space-y-3"
                          >
                            <Avatar class="w-24 h-24 lg:w-28 lg:h-28 ring-4 ring-primary/30 shadow-xl">
                              <AvatarImage src={user().profilePicture} alt={user().name} />
                              <AvatarFallback class="bg-gradient-to-br from-primary to-primary/70 text-white text-xl lg:text-2xl font-bold">
                                {user().name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div class="text-center space-y-1">
                              <p class="text-xl lg:text-2xl font-semibold text-gray-900 dark:text-white">
                                {user().name}
                              </p>
                              <p class="text-gray-600 dark:text-gray-400 text-xs lg:text-sm">
                                Introduce tu PIN de seguridad
                              </p>
                            </div>
                          </Motion.div>
                          {/* Right Column - PIN Input */}
                          <Motion.div
                            initial={{ opacity: 0, x: 30 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: 0.2 }}
                            class="flex-1 max-w-xs flex flex-col items-center space-y-4"
                          >
                            {/* PIN dots */}
                            <Motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: 0.3, duration: 0.3 }}
                            >
                              {renderPinDots('w-3 h-3 lg:w-4 lg:h-4')}
                            </Motion.div>

                            {/* Error message */}
                            <Presence>
                              <Show when={error()}>
                                <Motion.p
                                  initial={{ opacity: 0, y: -10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -10 }}
                                  class="text-red-500 text-center font-medium text-xs lg:text-sm"
                                >
                                  {error()}
                                </Motion.p>
                              </Show>
                            </Presence>

                            {/* Numpad */}
                            <Motion.div
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.4, duration: 0.3 }}
                              class="w-full"
                            >
                              {renderNumpad()}
                            </Motion.div>
                          </Motion.div>
                        </div>
                      </Show>

                      {/* Back button - Always at bottom */}
                      <Motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5, duration: 0.3 }}
                        class={`flex justify-center ${isDesktopLayout() ? 'mt-8' : 'mt-4'}`}
                      >
                        <Button
                          variant="ghost"
                          onClick={() => setSelectedUser(null)}
                          class="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-white/20 dark:hover:bg-gray-800/20"
                        >
                          {'\u2190'} Cambiar usuario
                        </Button>
                      </Motion.div>
                    </Motion.div>
                  )}
                </Show>
              </Presence>
            </div>
          </Motion.div>

          {/* Fullscreen button - outside container - Only on desktop and web */}
          <Show
            when={
              !responsive.isMobile &&
              !isTauri() &&
              typeof window !== 'undefined' &&
              !window.location.href.includes('tauri')
            }
          >
            <Motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              class="mt-6"
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
                class="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm text-gray-700 dark:text-gray-300 hover:bg-white/80 dark:hover:bg-gray-800/80 shadow-lg border border-white/20"
              >
                Pantalla completa
              </Button>
            </Motion.div>
          </Show>
        </div>
      </div>
    </Show>
  );
};

export default Login;
