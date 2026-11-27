import { useState } from "react";
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
  UserPlusIcon,
  HomeModernIcon,
  ShareIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import { useOrganization } from "../context/OrganizationContext";

const navigationItems = [
  { key: "dashboard", href: "/", icon: Squares2X2Icon, roles: ["admin", "staff", "user"] },
  { key: "members", href: "/members", icon: UsersIcon, roles: ["admin", "staff", "user"] },
  { key: "data_entry", href: "/data-entry", icon: UserPlusIcon, roles: ["admin", "staff", "user"] },
  { key: "donations", href: "/donations", icon: HeartIcon, roles: ["admin"] },
  { key: "families", href: "/families", icon: HomeModernIcon, roles: ["admin", "staff", "user"] },
  { key: "family_tree", href: "/family-tree", icon: ShareIcon, roles: ["admin", "staff", "user"] },
  { key: "documents", href: "/documents", icon: DocumentTextIcon, roles: ["admin", "user"] },
  { key: "chat", href: "/chat", icon: ChatBubbleLeftRightIcon, roles: ["admin", "staff", "user"] },
  { key: "notifications", href: "/notifications", icon: BellIcon, roles: ["admin", "staff", "user"] },
  { key: "reports", href: "/reports", icon: ChartBarSquareIcon, roles: ["admin"] },
  { key: "backups", href: "/backups", icon: ArchiveBoxIcon, roles: ["admin"] },
  { key: "settings", href: "/settings", icon: Cog6ToothIcon, roles: ["admin", "staff", "user"] },
];

const accountLinks = [
  { key: "account_profile", href: "/profile", icon: UserCircleIcon, roles: ["admin", "staff", "user"] },
  {
    key: "staff_management",
    href: "/admin/users",
    icon: ShieldCheckIcon,
    roles: ["admin"],
  },
];

export default function Sidebar({ isOpen, toggle }) {
  const { t } = useLanguage();
  const { user, signOut } = useAuth();
  const { logo, name: orgName } = useOrganization();
  const navigate = useNavigate();
  const [failedAvatar, setFailedAvatar] = useState("");
  const roleKey = `role_${user?.role}`;
  const translatedRole = user?.role ? t(roleKey) : '';
  const roleLabel = translatedRole === roleKey ? user.role : translatedRole;

  const handleSignOut = async () => {
    try {
      await signOut();
    } finally {
      navigate("/login", { replace: true });
    }
  };

  return (
    <>
      {isOpen && (
        <div
          onClick={toggle}
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-50 h-screen w-72 border-r border-slate-200 bg-white shadow-xl transition-transform duration-300 ease-in-out
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center justify-between border-b border-slate-200 px-6">
            <div className="flex items-center gap-3">
              {logo ? (
                <img
                  src={logo}
                  alt={orgName || t("app_name")}
                  className="h-11 w-11 rounded-xl border border-slate-200 bg-white object-contain p-0.5 shadow-sm"
                />
              ) : (
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-800 text-lg font-bold text-white shadow-sm">
                  KB
                </div>
              )}
              <div className="min-w-0">
                <h1 className="truncate text-lg font-bold leading-tight text-slate-800">
                  {orgName || t("app_name")}
                </h1>
                <p className="truncate text-xs text-slate-500">{t("management_system")}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={toggle}
              className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 lg:hidden"
              aria-label={t("close")}
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto px-4 py-5" aria-label={t("dashboard")}>
            <ul className="space-y-1.5">
              {navigationItems
                .filter((item) => item.roles.includes(user?.role))
                .map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.key}>
                      <NavLink
                        to={item.href}
                        end={item.href === "/"}
                        className={({ isActive }) =>
                          `group flex items-center gap-3.5 rounded-xl px-4 py-2.5 transition-colors duration-200 ${
                            isActive
                              ? "bg-emerald-800 text-white shadow-sm"
                              : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-800"
                          }`
                        }
                      >
                        {({ isActive }) => (
                          <>
                            <Icon
                              className={`h-5 w-5 shrink-0 ${
                                isActive ? "text-white" : "text-slate-500 group-hover:text-emerald-700"
                              }`}
                            />
                            <span className="truncate text-sm font-medium">{t(item.key)}</span>
                          </>
                        )}
                      </NavLink>
                    </li>
                  );
                })}
            </ul>
          </nav>

          <div className="border-t border-slate-200 p-4">
            {user && (
              <>
                <div className="mb-3 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  {user.photo && failedAvatar !== user.photo ? (
                    <img
                      src={user.photo}
                      alt={user.name}
                      onError={() => setFailedAvatar(user.photo)}
                      className="h-9 w-9 shrink-0 rounded-full border border-slate-200 bg-white object-cover shadow-sm"
                    />
                  ) : (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-800 text-sm font-bold text-white shadow-sm">
                      {user.name?.charAt(0).toUpperCase() || "?"}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">{user.name}</p>
                    <p className="truncate text-xs text-slate-500">{roleLabel}</p>
                  </div>
                </div>

                <ul className="mb-2 space-y-1">
                  {accountLinks
                    .filter((item) => item.roles.includes(user.role))
                    .map((item) => {
                      const Icon = item.icon;
                      return (
                        <li key={item.key}>
                          <NavLink
                            to={item.href}
                            className={({ isActive }) =>
                              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                                isActive
                                  ? "bg-emerald-50 text-emerald-800"
                                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                              }`
                            }
                          >
                            <Icon className="h-5 w-5" />
                            <span className="truncate">{t(item.key)}</span>
                          </NavLink>
                        </li>
                      );
                    })}
                </ul>

                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                >
                  <ArrowRightOnRectangleIcon className="h-5 w-5" />
                  <span>{t("sign_out")}</span>
                </button>
              </>
            )}
            <p className="mt-4 text-center text-xs text-slate-400">
              {t('copyright_line', { year: new Date().getFullYear() })}
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
