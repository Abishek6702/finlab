import { useCallback, useEffect, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  ArrowLeftRight, 
  Bell, 
  ChartNoAxesCombined, 
  ChartPie, 
  ChevronDown, 
  CircleUserRound, 
  LayoutDashboard, 
  LogOut, 
  Menu, 
  Repeat, 
  Settings, 
  SlidersHorizontal, 
  Tags, 
  Target, 
  Wallet,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import ThemeToggle from '../components/common/ThemeToggle';
import OverviewView from '../components/views/OverviewView';
import TransactionsView from '../components/views/TransactionsView';
import AccountsView from '../components/views/AccountsView';
import CategoriesView from '../components/views/CategoriesView';
import BudgetsView from '../components/views/BudgetsView';
import RecurringView from '../components/views/RecurringView';
import SavingsGoalsView from '../components/views/SavingsGoalsView';
import ReportsView from '../components/views/ReportsView';
import SettingsView from '../components/views/SettingsView';
import QuickActionDock from '../components/common/QuickActionDock';
import { notificationApi } from '../api/apiClient';

// Finalized navigation structure matching Part 4
const navSections = [
  {
    group: 'WORKSPACE',
    items: [
      { label: 'Overview', icon: LayoutDashboard, to: '/dashboard' },
      { label: 'Transactions', icon: ArrowLeftRight, to: '/transactions' },
      { label: 'Accounts', icon: Wallet, to: '/accounts' },
      { label: 'Categories', icon: Tags, to: '/categories' },
    ],
  },
  {
    group: 'PLANNING',
    items: [
      { label: 'Budgets', icon: ChartPie, to: '/budgets' },
      { label: 'Recurring Transactions', icon: Repeat, to: '/recurring' },
      { label: 'Savings Goals', icon: Target, to: '/savings-goals' },
    ],
  },
  {
    group: 'ANALYSIS',
    items: [
      { label: 'Reports & Analytics', icon: ChartNoAxesCombined, to: '/reports' },
    ],
  },
  {
    group: 'PREFERENCES',
    items: [
      { label: 'Settings', icon: Settings, to: '/settings' },
    ],
  },
];

function Sidebar({ mobile = false, mobileOpen = false, onNavigate, collapsed = false }) {
  return (
    <aside
      className={`${
        mobile
          ? `fixed inset-y-0 left-0 z-40 w-[280px] shadow-2xl transition-transform duration-200 ${
              mobileOpen ? 'translate-x-0' : '-translate-x-full'
            }`
          : 'hidden md:flex'
      } ${
        collapsed && !mobile ? 'w-[76px]' : 'w-[252px]'
      } h-dvh min-h-0 shrink-0 flex-col overflow-y-auto overscroll-contain border-r border-[var(--border)] bg-[var(--surface)] px-3 py-5 select-none`}
    >
      {/* Brand Header */}
      <div className={`mb-6 flex h-10 items-center ${collapsed && !mobile ? 'justify-center' : 'gap-3 px-2'}`}>
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--primary)] text-xs font-bold text-white shadow-xs">
          FL
        </span>
        {(!collapsed || mobile) && (
          <div className="leading-tight">
            <div className="text-sm font-bold tracking-tight text-[var(--text)]">FinLab</div>
            <div className="text-[10px] font-semibold text-[var(--text-muted)] tracking-wider">PERSONAL FINANCE</div>
          </div>
        )}
      </div>

      {/* Nav Groups */}
      <div className="space-y-6">
        {navSections.map((sec) => (
          <div key={sec.group}>
            {(!collapsed || mobile) && (
              <div className="mb-2 px-3 text-[10px] font-bold tracking-[.12em] text-[var(--text-muted)] uppercase">
                {sec.group}
              </div>
            )}
            <nav className="grid gap-1" aria-label={sec.group}>
              {sec.items.map((item) => {
                const IconComp = item.icon;

                return (
                  <NavLink
                    key={item.label}
                    to={item.to}
                    onClick={onNavigate}
                    title={collapsed && !mobile ? item.label : undefined}
                    className={({ isActive }) =>
                      `flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-xs font-medium transition-colors ${
                        collapsed && !mobile ? 'justify-center px-0' : ''
                      } ${
                        isActive
                          ? 'bg-[var(--primary-soft)] text-[var(--primary)] font-semibold'
                          : 'text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] hover:text-[var(--text)]'
                      }`
                    }
                  >
                    <IconComp size={16} className="shrink-0" />
                    {(!collapsed || mobile) && <span className="min-w-0 flex-1 truncate">{item.label}</span>}
                  </NavLink>
                );
              })}
            </nav>
          </div>
        ))}
      </div>
    </aside>
  );
}

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || undefined;

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const profileMenuRef = useRef(null);
  const notifMenuRef = useRef(null);

  const initials = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}` || 'FL';

  const openQuickAddTransaction = (type = 'expense') => {
    const isTrans = pathname.startsWith('/transactions');
    const targetPath = isTrans ? pathname : '/transactions';
    const params = new URLSearchParams(isTrans ? search : '');
    params.set('add', '1');
    if (type) params.set('type', type);
    navigate({ pathname: targetPath, search: `?${params.toString()}` });
  };

  const reloadNotifications = useCallback(() => {
    return notificationApi.getAll()
      .then((res) => {
        if (res.data?.success) {
          setNotifications(res.data.data.items || []);
          setUnreadCount(res.data.data.unreadCount || 0);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    reloadNotifications();
    const refreshTimer = window.setInterval(reloadNotifications, 60_000);
    return () => window.clearInterval(refreshTimer);
  }, [reloadNotifications]);

  const handleOpenNotification = async (notification) => {
    try {
      if (!notification.isRead) await notificationApi.markAsRead(notification._id);
    } catch (error) {
      console.error('Unable to mark notification as read', error);
    }
    setNotifOpen(false);
    reloadNotifications();
    if (notification.link?.startsWith('/') && !notification.link.startsWith('//')) {
      navigate(notification.link);
    }
  };

  const handleDeleteNotification = async (id) => {
    try {
      await notificationApi.delete(id);
      await reloadNotifications();
    } catch (error) {
      console.error('Unable to delete notification', error);
    }
  };

  const handleMarkAllNotifications = async () => {
    try {
      await notificationApi.markAllAsRead();
      await reloadNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  // Close menus on outside click
  useEffect(() => {
    const closeOnClick = (e) => {
      if (profileOpen && !profileMenuRef.current?.contains(e.target)) {
        setProfileOpen(false);
      }
      if (notifOpen && !notifMenuRef.current?.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('pointerdown', closeOnClick);
    return () => document.removeEventListener('pointerdown', closeOnClick);
  }, [profileOpen, notifOpen]);

  // Render view by route
  const renderCurrentView = () => {
    if (pathname === '/dashboard') {
      return <OverviewView onQuickAddTransaction={openQuickAddTransaction} />;
    }
    if (pathname.startsWith('/transactions')) {
      return <TransactionsView initialTab={currentTab || 'all'} />;
    }
    if (pathname.startsWith('/accounts')) {
      return <AccountsView initialTab={currentTab || 'all'} />;
    }
    if (pathname.startsWith('/categories')) {
      return <CategoriesView initialType={currentTab || 'expense'} />;
    }
    if (pathname.startsWith('/budgets')) {
      return <BudgetsView initialTab={currentTab || 'overview'} />;
    }
    if (pathname.startsWith('/recurring')) {
      return <RecurringView initialTab={currentTab || 'all'} />;
    }
    if (pathname.startsWith('/savings-goals')) {
      return <SavingsGoalsView initialTab={currentTab || 'all'} />;
    }
    if (pathname.startsWith('/reports')) {
      return <ReportsView initialTab={currentTab || 'overview'} />;
    }
    if (pathname.startsWith('/settings') || pathname === '/profile' || pathname === '/preferences') {
      const tab = pathname === '/profile' ? 'profile' : pathname === '/preferences' ? 'preferences' : currentTab || 'profile';
      return <SettingsView initialTab={tab} />;
    }
    return <OverviewView />;
  };

  return (
    <div className="flex h-dvh overflow-hidden bg-[var(--background)] text-[var(--text)]">
      {/* Desktop Sidebar */}
      <Sidebar collapsed={collapsed} />

      {/* Mobile Drawer */}
      <div
        className={`fixed inset-0 z-30 md:hidden ${mobileOpen ? '' : 'pointer-events-none'}`}
        aria-hidden={!mobileOpen}
      >
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className={`absolute inset-0 bg-slate-950/45 transition-opacity ${
            mobileOpen ? 'opacity-100' : 'opacity-0'
          }`}
        />
        <Sidebar mobile mobileOpen={mobileOpen} onNavigate={() => setMobileOpen(false)} />
      </div>

      {/* Main Content Area */}
      <main className="flex h-dvh min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {/* Top Navbar */}
        <header className="z-10 flex min-h-[64px] shrink-0 items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--surface)] px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="grid size-9 place-items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] md:hidden"
            >
              <Menu size={18} />
            </button>
            <button
              type="button"
              onClick={() => setCollapsed(!collapsed)}
              className="hidden size-9 place-items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] md:grid"
            >
              <Menu size={18} />
            </button>
            <div className="hidden text-xs font-medium text-[var(--text-muted)] sm:block">
              <span>Workspace</span>
              <span className="mx-2">/</span>
              <span className="text-[var(--text)] capitalize">
                {pathname.replace('/', '').replace('-', ' ') || 'Overview'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* QuickActionDock in Navbar */}
            <QuickActionDock onAdd={openQuickAddTransaction} />

            {/* Notifications Bell */}
            <div className="relative" ref={notifMenuRef}>
              <button
                type="button"
                onClick={() => {
                  const nextOpen = !notifOpen;
                  setNotifOpen(nextOpen);
                  if (nextOpen) reloadNotifications();
                }}
                aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
                aria-expanded={notifOpen}
                className="relative grid size-9 place-items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] transition"
              >
                <Bell size={16} />
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-rose-500 px-1 text-center text-[9px] font-bold leading-4 text-white">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 top-11 z-40 w-80 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-xl text-xs">
                  <div className="flex items-center justify-between border-b border-[var(--border)] pb-2 mb-2 font-semibold">
                    <span>Notifications</span>
                    <div className="flex items-center gap-2">
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={handleMarkAllNotifications}
                          className="text-[10px] text-[var(--primary)] hover:underline"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                  </div>
                  {notifications.length > 0 ? (
                    <div className="max-h-64 space-y-2 overflow-y-auto">
                      {notifications.map((notification) => (
                        <div key={notification._id} className={`flex items-start gap-1 rounded-xl border p-2 ${notification.isRead ? 'border-[var(--border)] bg-[var(--surface-raised)]/30' : 'border-[var(--primary)]/25 bg-[var(--primary-soft)]/30'}`}>
                          <button
                            type="button"
                            onClick={() => handleOpenNotification(notification)}
                            className="min-w-0 flex-1 rounded-lg p-1 text-left hover:bg-[var(--surface)]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40"
                          >
                            <span className={`mb-1 inline-flex rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${notification.severity === 'danger' ? 'bg-rose-500/10 text-rose-600' : notification.severity === 'warning' ? 'bg-amber-500/10 text-amber-700' : notification.severity === 'success' ? 'bg-emerald-500/10 text-emerald-700' : 'bg-blue-500/10 text-blue-600'}`}>
                              {notification.type === 'budget_alert' ? 'Budget' : notification.type === 'recurring_reminder' ? 'Recurring' : notification.type === 'summary' ? 'Daily summary' : notification.type || 'Update'}
                            </span>
                            <span className="block font-semibold text-[var(--text)]">{notification.title}</span>
                            <span className="mt-0.5 block text-[11px] leading-4 text-[var(--text-secondary)]">{notification.message}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteNotification(notification._id)}
                            aria-label={`Delete ${notification.title} notification`}
                            className="grid size-7 shrink-0 place-items-center rounded-md text-[var(--text-muted)] hover:bg-[var(--surface)] hover:text-[var(--text)]"
                          >
                            <X size={13} aria-hidden="true" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-6 text-center text-xs text-[var(--text-muted)]">
                      No notifications at this time.
                    </div>
                  )}
                </div>
              )}
            </div>

            <ThemeToggle compact />

            {/* Profile Dropdown */}
            <div className="relative" ref={profileMenuRef}>
              <button
                type="button"
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 rounded-xl p-1 hover:bg-[var(--surface-raised)] transition"
              >
                <span className="grid size-8 place-items-center rounded-full bg-[var(--primary-soft)] text-[11px] font-bold text-[var(--primary)]">
                  {initials}
                </span>
                <span className="hidden text-xs font-semibold sm:block">
                  {user?.firstName || 'Account'}
                </span>
                <ChevronDown size={14} className="hidden text-[var(--text-muted)] sm:block" />
              </button>

              {profileOpen && (
                <div className="absolute right-0 top-11 z-40 w-64 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-2 shadow-xl text-xs">
                  <div className="border-b border-[var(--border)] px-3 py-2">
                    <div className="font-bold text-[var(--text)]">{user?.firstName} {user?.lastName}</div>
                    <div className="text-[10px] text-[var(--text-muted)] truncate">{user?.email}</div>
                  </div>
                  <div className="py-1">
                    <NavLink
                      to="/settings?tab=profile"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] hover:text-[var(--text)]"
                    >
                      <CircleUserRound size={15} />
                      Profile
                    </NavLink>
                    <NavLink
                      to="/settings?tab=preferences"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] hover:text-[var(--text)]"
                    >
                      <SlidersHorizontal size={15} />
                      Preferences
                    </NavLink>
                    <NavLink
                      to="/settings?tab=security"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] hover:text-[var(--text)]"
                    >
                      <ShieldCheck size={15} />
                      Security & Sessions
                    </NavLink>
                  </div>
                  <div className="border-t border-[var(--border)] pt-1 space-y-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setProfileOpen(false);
                        logout();
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 font-medium text-rose-600 hover:bg-rose-500/10"
                    >
                      <LogOut size={15} />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Scrollable View Content */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            {renderCurrentView()}
          </div>
        </div>
      </main>

     
    </div>
  );
}
