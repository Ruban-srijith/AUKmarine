import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { 
  Anchor, LayoutDashboard, Package, ShoppingCart, Truck, Users, 
  UserSquare2, BarChart3, FileSpreadsheet, Settings, UserCog, 
  Menu, X, Bell, Moon, Sun, LogOut, ChevronDown 
} from 'lucide-react';

const Layout = ({ children }) => {
  const { user, logout, hasRole } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const location = useLocation();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  // Initialize Dark Mode state from DOM class list
  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setDarkMode(isDark);
  }, []);

  const toggleDarkMode = () => {
    if (darkMode) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    }
    setDarkMode(!darkMode);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Nav items list based on permissions
  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard, allowed: ['Owner', 'Manager', 'Staff'] },
    { name: 'Inventory', path: '/inventory', icon: Package, allowed: ['Owner', 'Manager', 'Staff'] },
    { name: 'Sales POS', path: '/sales-pos', icon: ShoppingCart, allowed: ['Owner', 'Manager', 'Staff'] },
    { name: 'Purchases', path: '/purchases', icon: Truck, allowed: ['Owner', 'Manager'] },
    { name: 'Customers', path: '/customers', icon: Users, allowed: ['Owner', 'Manager', 'Staff'] },
    { name: 'Suppliers', path: '/suppliers', icon: UserSquare2, allowed: ['Owner', 'Manager'] },
    { name: 'Analytics', path: '/analytics', icon: BarChart3, allowed: ['Owner', 'Manager'] },
    { name: 'Reports', path: '/reports', icon: FileSpreadsheet, allowed: ['Owner', 'Manager'] },
    { name: 'User Access', path: '/users', icon: UserCog, allowed: ['Owner', 'Manager'] },
    { name: 'Settings', path: '/settings', icon: Settings, allowed: ['Owner'] },
  ];

  return (
    <div className={`min-h-screen bg-transparent text-gray-900 dark:text-gray-100 flex transition-colors duration-200 relative overflow-hidden`}>
      {/* Liquid Glass Background Blobs */}
      <div className="liquid-blob-1" />
      <div className="liquid-blob-2" />
      <div className="liquid-blob-3" />

      {/* MOBILE SIDEBAR DRAWER OVERLAY */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-gray-900/40 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* SIDEBAR PANEL */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border-r border-white/20 dark:border-slate-800/10 
        transform lg:transform-none lg:static transition-transform duration-300 ease-in-out flex flex-col
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* LOGO AREA */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-100 dark:border-gray-700">
          <Link to="/" className="flex items-center gap-2.5 font-bold text-xl text-brand-600 dark:text-brand-400">
            <Anchor className="h-6 w-6 stroke-[2.5]" />
            <span>AUK marine</span>
          </Link>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-750"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* SIDEBAR NAVIGATION LINKS */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const allowed = hasRole(item.allowed);
            if (!allowed) return null;

            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150
                  ${isActive 
                    ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20' 
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-white'}
                `}
              >
                <Icon className={`h-4.5 w-4.5 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* USER PROFILE INFO BANNER */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-900/40 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold text-sm">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate text-gray-900 dark:text-white">{user?.name}</p>
              <span className="inline-block px-2 py-0.5 mt-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-gray-200/60 dark:bg-gray-750 text-gray-600 dark:text-gray-400">
                {user?.role}
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* CORE CONTENT SHELL */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* HEADER BAR */}
        <header className="h-16 bg-white/30 dark:bg-slate-900/30 backdrop-blur-md border-b border-white/20 dark:border-slate-800/10 sticky top-0 z-30 flex items-center justify-between px-6">
          
          {/* HAMBURGER TOGGLE */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-750"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-bold hidden sm:block text-gray-900 dark:text-white capitalize">
              {location.pathname === '/' ? 'Overview Dashboard' : location.pathname.substring(1).replace('-', ' ')}
            </h1>
          </div>

          {/* ACTION BUTTONS (DARK MODE, NOTIFS, PROFILE) */}
          <div className="flex items-center gap-3">
            
            {/* DARK MODE SWITCH */}
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors"
              title="Toggle theme"
            >
              {darkMode ? <Sun className="h-5 w-5 text-amber-500" /> : <Moon className="h-5 w-5" />}
            </button>

            {/* NOTIFICATIONS DROPDOWN */}
            <div className="relative">
              <button
                onClick={() => {
                  setNotifOpen(!notifOpen);
                  setProfileOpen(false);
                }}
                className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors relative"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-[10px] font-bold text-white flex items-center justify-center rounded-full animate-pulse-slow">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                 <div className="absolute right-0 mt-2 w-80 glass-card rounded-2xl shadow-xl overflow-hidden z-50">
                  <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <span className="font-semibold text-sm">Notifications ({unreadCount})</span>
                    {unreadCount > 0 && (
                      <button 
                        onClick={markAllAsRead}
                        className="text-xs text-brand-500 hover:underline"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-64 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-750">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-xs text-gray-400">
                        No alerts or notifications.
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div 
                          key={notif.id} 
                          className={`p-4 text-xs transition-colors hover:bg-gray-50 dark:hover:bg-gray-750 ${!notif.read ? 'bg-brand-50/20 dark:bg-brand-900/10' : ''}`}
                        >
                          <div className="flex justify-between items-start gap-2">
                            <span className="font-bold text-gray-900 dark:text-white">
                              {notif.type === 'LowStock' ? '⚠️ ' : notif.type === 'Expiry' ? '📅 ' : 'ℹ️ '} 
                              {notif.title}
                            </span>
                            {!notif.read && (
                              <button 
                                onClick={() => markAsRead(notif.id)}
                                className="text-[10px] text-brand-500 hover:underline font-medium shrink-0"
                              >
                                Dismiss
                              </button>
                            )}
                          </div>
                          <p className="mt-1 text-gray-600 dark:text-gray-300 leading-relaxed">{notif.message}</p>
                          <span className="block mt-2 text-[9px] text-gray-400">
                            {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* USER PROFILE ACCOUNT MENU */}
            <div className="relative">
              <button
                onClick={() => {
                  setProfileOpen(!profileOpen);
                  setNotifOpen(false);
                }}
                className="flex items-center gap-1.5 p-1 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-brand-500 text-white flex items-center justify-center font-bold text-sm">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <ChevronDown className="h-4 w-4 text-gray-400 hidden sm:block" />
              </button>

              {profileOpen && (
                 <div className="absolute right-0 mt-2 w-48 glass-card rounded-2xl shadow-xl overflow-hidden z-50">
                  <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                    <p className="text-xs text-gray-450 dark:text-gray-400 font-medium">Logged in as</p>
                    <p className="text-sm font-semibold truncate mt-0.5 text-gray-900 dark:text-white">{user?.email}</p>
                  </div>
                  <div className="p-1.5">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors font-medium"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Log Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>

        </header>

        {/* CONTAINER PANEL FOR INDIVIDUAL PAGE RENDER */}
        <main className="flex-1 overflow-auto p-6 md:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>

      </div>
    </div>
  );
};

export default Layout;
