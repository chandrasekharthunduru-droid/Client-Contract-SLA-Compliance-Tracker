import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FileText, Users, ShieldCheck, AlertTriangle,
  Bell, BarChart3, LogOut, Menu, X, ChevronDown, Zap, Search, FlaskConical, Briefcase
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { alertsAPI } from '../../api';
import { getInitials } from '../../utils/formatters';
import { motion } from 'framer-motion';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/contracts', icon: FileText, label: 'Contracts' },
  { path: '/customers', icon: Users, label: 'Customers' },
  { path: '/sla', icon: ShieldCheck, label: 'SLA Management' },
  { path: '/incidents', icon: AlertTriangle, label: 'Incidents' },
  { path: '/alerts', icon: Bell, label: 'Alerts' },
  { path: '/reports', icon: BarChart3, label: 'Reports' },
  { path: '/staff', icon: Briefcase, label: 'Staff Details' },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const isDemo = localStorage.getItem('bsx_demo') === 'true';

  const visibleNavItems = navItems.filter(item => {
    if (item.path === '/staff') return user?.role === 'admin';
    return true;
  });

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const { data } = await alertsAPI.getAll({ is_read: false, limit: 1 });
        setUnreadCount(data.unread_count || 0);
      } catch {
        // Ignore fetch errors
      }
    };
    fetchUnread();
    
    window.addEventListener('alerts-updated', fetchUnread);
    const interval = setInterval(fetchUnread, 60000);
    return () => {
      window.removeEventListener('alerts-updated', fetchUnread);
      clearInterval(interval);
    };
  }, [location.pathname]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) navigate(`/contracts?search=${encodeURIComponent(searchQuery.trim())}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* ── Top Navigation Bar ─────────────────────────────── */}
      <header className="fixed top-0 inset-x-0 z-40 bg-navy-900 shadow-xl">
        {/* ── Demo Mode Banner ───────────────────────────────── */}
        {isDemo && (
          <div className="bg-amber-500 text-white text-xs font-semibold text-center py-1.5 px-4 flex items-center justify-center gap-3">
            <FlaskConical size={13} />
            <span>DEMO MODE — Running with mock data. No backend required.</span>
            <button
              onClick={() => {
                localStorage.removeItem('bsx_demo');
                window.location.reload();
              }}
              className="bg-white/20 hover:bg-white/30 text-white px-2 py-0.5 rounded text-[10px] uppercase font-bold transition-colors cursor-pointer border border-white/10"
            >
              Connect Real Data
            </button>
          </div>
        )}
        <div className="flex items-center justify-between h-16 px-4 lg:px-6">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-2 rounded-lg text-white/70 hover:bg-white/10"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={20} />
            </button>
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 bg-electric-500 rounded-lg flex items-center justify-center shadow-glow group-hover:shadow-glow-lg transition-all">
                <Zap size={18} className="text-white" />
              </div>
              <span className="font-bold text-white text-lg tracking-tight hidden sm:block">
                Brand<span className="text-electric-400">Spark</span>
                <span className="text-electric-300">X</span>
              </span>
            </Link>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {visibleNavItems.map(({ path, icon: Icon, label }) => {
              const active = location.pathname === path || (path !== '/' && location.pathname.startsWith(path));
              return (
                <Link key={path} to={path}
                  className={`relative flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                    active ? 'text-electric-300' : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="activeTab"
                      className="absolute inset-0 bg-electric-500/20 rounded-lg z-0"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-2">
                    <Icon size={16} />
                    <span>{label}</span>
                    {label === 'Alerts' && unreadCount > 0 && (
                      <span className="ml-0.5 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </span>
                </Link>
              );
            })}
          </nav>

          {/* Search + User */}
          <div className="flex items-center gap-3">
            {/* Search */}
            <form onSubmit={handleSearch} className="hidden md:flex items-center">
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search contracts..."
                  className="pl-9 pr-4 py-2 bg-white/10 border border-white/10 rounded-lg text-sm text-white placeholder-white/40
                             focus:outline-none focus:bg-white/15 focus:border-electric-500/50 transition-all w-48 focus:w-64"
                />
              </div>
            </form>

            {/* Alert Bell (mobile) */}
            <Link to="/alerts" className="relative lg:hidden p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg">
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </Link>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              >
                <div className="w-8 h-8 bg-electric-500 rounded-lg flex items-center justify-center text-white text-xs font-bold">
                  {getInitials(user?.name)}
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-white text-sm font-medium leading-tight">{user?.name}</div>
                  <div className="text-white/50 text-xs capitalize">{user?.role}</div>
                </div>
                <ChevronDown size={14} className="text-white/50 hidden sm:block" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-2xl border border-gray-100 py-1 z-50 animate-slide-down">
                  <div className="px-4 py-2.5 border-b border-gray-100">
                    <div className="text-sm font-semibold text-gray-900">{user?.name}</div>
                    <div className="text-xs text-gray-400">{user?.email}</div>
                    <span className={`mt-1 badge badge-${user?.role === 'admin' ? 'critical' : user?.role === 'manager' ? 'high' : 'medium'}`}>
                      {user?.role}
                    </span>
                  </div>
                  <button
                    onClick={logout}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut size={15} /> Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ── Mobile Sidebar Overlay ─────────────────────────── */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-navy-900 shadow-2xl animate-slide-up p-4">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-electric-500 rounded-lg flex items-center justify-center">
                  <Zap size={18} className="text-white" />
                </div>
                <span className="font-bold text-white">BrandSparkX</span>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg">
                <X size={18} />
              </button>
            </div>
            <nav className="space-y-1">
              {visibleNavItems.map(({ path, icon: Icon, label }) => {
                const active = location.pathname === path || (path !== '/' && location.pathname.startsWith(path));
                return (
                  <Link key={path} to={path}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all ${
                      active ? 'bg-electric-500/20 text-electric-300' : 'text-white/70 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Icon size={18} />
                    {label}
                    {label === 'Alerts' && unreadCount > 0 && (
                      <span className="ml-auto bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{unreadCount}</span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* ── Main Content ───────────────────────────────────── */}
      <main className={`flex-1 ${isDemo ? 'pt-24 sm:pt-[88px]' : 'pt-16'}`} onClick={() => setUserMenuOpen(false)}>
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </div>
      </main>
    </div>
  );
}
