'use client';

import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink } from '../../lib/navigation';
import {
  LayoutDashboard,
  Globe,
  Tags,
  List,
  Settings,
  Activity,
  Menu,
  X,
  ChevronsLeft,
  ChevronsRight,
  Shuffle,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useApiDownToast } from '../../hooks/useApiToasts';
import { useFeelLucky } from '../../hooks/useFeelLucky';
import { ThemeToggle } from '../theme-toggle';

import { getAppVersion } from '../../config/version';

export function Layout({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  useApiDownToast();
  const { loading: feelLuckyLoading, feelLucky } = useFeelLucky();
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('sos-sidebar-collapsed') === 'true';
    } catch {
      return false;
    }
  });
  const [showCollapsedVersion, setShowCollapsedVersion] = useState(false);
  const appVersion = getAppVersion();

  useEffect(() => {
    try {
      localStorage.setItem('sos-sidebar-collapsed', String(collapsed));
    } catch {
      // ignore storage errors
    }
  }, [collapsed]);

  const navItems = [
    { to: '/', label: t('nav.dashboard'), icon: LayoutDashboard },
    { to: '/worlds', label: t('nav.worlds'), icon: Globe },
    { to: '/tags', label: t('nav.tags'), icon: Tags },
    { to: '/lists', label: t('nav.lists'), icon: List },
    { to: '/settings', label: t('nav.settings'), icon: Settings },
  ];

  return (
    <div className="flex min-h-screen">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60] focus:rounded-lg focus:bg-indigo-600 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
      >
        {t('layout.skipToContent')}
      </a>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex flex-col transform border-r border-slate-200 bg-white
          transition-all duration-300 lg:relative lg:transform-none dark:border-slate-800 dark:bg-slate-900
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          w-60
          ${collapsed ? 'lg:w-16' : 'lg:w-60'}
        `}
      >
        <div className={`flex h-14 items-center border-b border-slate-200 px-4 dark:border-slate-800 ${collapsed ? 'lg:justify-center' : 'justify-between'}`}>
          <div className={`flex flex-col ${collapsed ? 'lg:hidden' : ''}`}>
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600">
                <Activity className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm font-bold text-slate-900 dark:text-white">{t('layout.appName')}</span>
            </div>
            <span className="mt-0.5 pl-9 text-[10px] text-slate-500 dark:text-slate-400">
              {t('layout.version')}: {appVersion}
            </span>
          </div>
          <div
            className={`relative z-20 hidden ${collapsed ? 'lg:flex' : ''}`}
            onMouseEnter={() => setShowCollapsedVersion(true)}
            onMouseLeave={() => setShowCollapsedVersion(false)}
            onClick={() => setShowCollapsedVersion((prev) => !prev)}
            role="button"
            tabIndex={0}
            aria-label={t('layout.appName')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setShowCollapsedVersion((prev) => !prev);
              }
            }}
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600">
              <Activity className="h-4 w-4 text-white" />
            </div>
            <span
              className={`pointer-events-none absolute left-full top-1/2 z-30 -translate-y-1/2 ml-2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs text-white opacity-0 transition-opacity dark:bg-white dark:text-slate-900 ${
                showCollapsedVersion ? 'opacity-100' : ''
              }`}
            >
              {t('layout.appName')} {appVersion}
            </span>
          </div>
          <button
            className="flex h-11 w-11 items-center justify-center rounded-lg lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label={t('layout.closeSidebar')}
          >
            <X className="h-5 w-5 text-slate-500 dark:text-slate-400" />
          </button>
        </div>

        <nav className="flex flex-col gap-1 p-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `group relative flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  collapsed ? 'lg:justify-center lg:gap-0 lg:px-2' : ''
                } ${
                  isActive
                    ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-300'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
                }`
              }
            >
              <item.icon className={`h-4 w-4 ${collapsed ? 'lg:h-5 lg:w-5' : ''}`} />
              <span className={`${collapsed ? 'lg:hidden' : ''}`}>{item.label}</span>
              {collapsed && (
                <span className="pointer-events-none absolute left-full ml-2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 dark:bg-white dark:text-slate-900">
                  {item.label}
                </span>
              )}
            </NavLink>
          ))}
          <button
            type="button"
            onClick={() => {
              setSidebarOpen(false);
              void feelLucky();
            }}
            disabled={feelLuckyLoading}
            aria-label={t('nav.feelLucky')}
            title={t('nav.feelLucky')}
            className={`group relative mt-2 flex min-h-11 items-center gap-3 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2.5 text-sm font-medium text-indigo-700 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-indigo-500/40 dark:bg-indigo-500/10 dark:text-indigo-300 dark:hover:bg-indigo-500/20 ${
              collapsed ? 'lg:justify-center lg:gap-0 lg:px-2' : ''
            }`}
          >
            <Shuffle className={`h-4 w-4 ${collapsed ? 'lg:h-5 lg:w-5' : ''}`} />
            <span className={`${collapsed ? 'lg:hidden' : ''}`}>{t('nav.feelLucky')}</span>
            {collapsed && (
              <span className="pointer-events-none absolute left-full ml-2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 dark:bg-white dark:text-slate-900">
                {t('nav.feelLucky')}
              </span>
            )}
          </button>
        </nav>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute right-0 top-3 z-10 hidden h-11 w-11 translate-x-1/2 items-center justify-center rounded-full border border-slate-200 bg-white p-1 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 lg:flex"
          aria-label={collapsed ? t('layout.expandSidebar') : t('layout.collapseSidebar')}
        >
          {collapsed ? (
            <ChevronsRight className="h-4 w-4 text-slate-500 dark:text-slate-400" />
          ) : (
            <ChevronsLeft className="h-4 w-4 text-slate-500 dark:text-slate-400" />
          )}
        </button>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-slate-200 bg-white/80 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
          <button
            className="flex h-11 w-11 items-center justify-center rounded-lg lg:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label={t('layout.openSidebar')}
          >
            <Menu className="h-5 w-5 text-slate-500 dark:text-slate-400" />
          </button>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
          </div>
        </header>

        <main id="main" className="min-w-0 flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
