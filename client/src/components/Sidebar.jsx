import { NavLink, useNavigate } from "react-router-dom";
import {
  XMarkIcon,
  ArrowRightOnRectangleIcon,
  UserCircleIcon,
  Squares2X2Icon,
  UsersIcon,
  HeartIcon,
  DocumentTextIcon,
  ChatBubbleLeftRightIcon,
  BellIcon,
  ChartBarSquareIcon,
  ArchiveBoxIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/outline";
import {
  GitBranch,
  UserPlus,
} from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";

const navigationItems = [
  { key: 'dashboard', href: "/", icon: Squares2X2Icon, roles: ['admin', 'staff', 'user'] },
  { key: 'members', href: "/members", icon: UsersIcon, roles: ['admin', 'staff', 'user'] },
  { key: 'data_entry', href: "/data-entry", icon: UserPlus, roles: ['admin', 'staff'] },
  { key: 'donations', href: "/donations", icon: HeartIcon, roles: ['admin', 'staff'] },
  { key: 'families', href: "/families", icon: GitBranch, roles: ['admin', 'staff', 'user'] },
  { key: 'family_tree', href: "/family-tree", icon: GitBranch, roles: ['admin', 'staff', 'user'] },
  { key: 'documents', href: "/documents", icon: DocumentTextIcon, roles: ['admin', 'user'] },
  { key: 'chat', href: "/chat", icon: ChatBubbleLeftRightIcon, roles: ['admin', 'staff', 'user'] },
  { key: 'notifications', href: "/notifications", icon: BellIcon, roles: ['admin', 'staff', 'user'] },
  { key: 'reports', href: "/reports", icon: ChartBarSquareIcon, roles: ['admin', 'staff', 'user'] },
  { key: 'backups', href: "/backups", icon: ArchiveBoxIcon, roles: ['admin'] },
  { key: 'settings', href: "/settings", icon: Cog6ToothIcon, roles: ['admin', 'staff', 'user'] },
];

const accountLinks = [
  { key: 'profile', href: "/profile", label: "My account", icon: UserCircleIcon },
  { key: 'admin_users', href: "/admin/users", label: "Staff & access", icon: UsersIcon, adminOnly: true },
];

export default function Sidebar({ isOpen, toggle }) {
  const { t } = useLanguage();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut();
    } finally {
      navigate('/login', { replace: true });
    }
  };

  return (
    <>
      {isOpen && (
        <div
          onClick={toggle}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-50 h-screen w-72 bg-white border-r border-slate-200 shadow-xl transition-transform duration-300 ease-in-out
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-16 border-b border-slate-200 flex items-center justify-between px-6">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
                <GitBranch className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-lg text-slate-800">
                  {t('app_name')}
                </h1>
                <p className="text-xs text-slate-500">
                  {t('management_system')}
                </p>
              </div>
            </div>
            <button
              onClick={toggle}
              className="lg:hidden rounded-lg p-2 hover:bg-slate-100"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-4 py-6">
            <ul className="space-y-2">
              {navigationItems.filter((item) => item.roles.includes(user?.role)).map((item) => {
                const Icon = item.icon;
                const label = t(item.key);
                return (
                  <li key={item.key}>
                    <NavLink
                      to={item.href}
                      end={item.href === "/"}
                      className={({ isActive }) =>
                        `group flex items-center gap-4 rounded-xl px-4 py-3 transition-all duration-200
                        ${
                          isActive
                            ? "bg-gradient-to-r from-green-600 to-emerald-500 text-white shadow-lg"
                            : "text-slate-700 hover:bg-slate-100 hover:text-green-600"
                        }`
                      }
                    >
                      <Icon className="h-6 w-6 flex-shrink-0" />
                      <span className="font-medium">{label}</span>
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Account + sign out */}
          <div className="border-t border-slate-200 p-4">
            {user && (
              <>
                <div className="mb-3 flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2">
                  <div className="h-9 w-9 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-center text-sm font-bold text-white">
                    {user.name?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">{user.name}</p>
                    <p className="text-xs capitalize text-slate-500">{user.role}</p>
                  </div>
                </div>
                <ul className="mb-2 space-y-1">
                  {accountLinks.filter((item) => !item.adminOnly || user.role === 'admin').map((item) => {
                    const Icon = item.icon;
                    return (
                      <li key={item.key}>
                        <NavLink
                          to={item.href}
                          className={({ isActive }) =>
                            `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                              isActive ? 'bg-green-50 text-green-700' : 'text-slate-600 hover:bg-slate-100'
                            }`
                          }
                        >
                          <Icon className="h-5 w-5" />
                          <span>{item.label}</span>
                        </NavLink>
                      </li>
                    );
                  })}
                </ul>
                <button
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-600 transition hover:bg-red-50 hover:text-red-700"
                >
                  <ArrowRightOnRectangleIcon className="h-5 w-5" />
                  <span>Sign out</span>
                </button>
              </>
            )}
            <p className="mt-4 text-center text-xs text-slate-400">
              © 2026 NDS Software
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
