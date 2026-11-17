import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery } from '@tanstack/react-query';
import api from "../api/axios";
import toast from 'react-hot-toast';
import {
  Bars3Icon,
  MagnifyingGlassIcon,
  BellIcon,
} from "@heroicons/react/24/outline";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";

const pageRoutes = [
  ["/dashboard", "dashboard"],
  ["/members", "members"],
  ["/profile", "members"],
  ["/data-entry", "data_entry"],
  ["/donations", "donations"],
  ["/families", "families"],
  ["/family-tree", "family_tree"],
  ["/documents", "documents"],
  ["/chat", "chat"],
  ["/notifications", "notifications"],
  ["/reports", "reports"],
  ["/backups", "backups"],
  ["/settings", "settings"],
  ["/admin/users", "admin_users"],
  ["/profile", "profile"],
];

export default function Header({ toggleSidebar }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { language, setLanguage, t } = useLanguage();
  const { user, signOut } = useAuth();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  const { data: searchResults, isFetching: searching } = useQuery({
    queryKey: ['globalSearch', debouncedSearch],
    queryFn: async () => (await api.get('/search', { params: { query: debouncedSearch } })).data.results,
    enabled: debouncedSearch.length >= 2,
    staleTime: 30_000,
  });

  const pageKey = pathname === '/profile'
    ? 'profile'
    : pageRoutes.find(([route]) => pathname === route || pathname.startsWith(`${route}/`))?.[1] || "dashboard";

  const handleSearch = (event) => {
    event.preventDefault();
    if (!search.trim()) return;
    setSearchOpen(false);
    navigate(`/members?search=${encodeURIComponent(search.trim())}`);
  };

  const openMember = (memberId) => {
    setSearchOpen(false);
    setSearch('');
    navigate(`/profile/${memberId}`);
  };

  const openFamily = (familyName) => {
    setSearchOpen(false);
    setSearch('');
    navigate(`/families?search=${encodeURIComponent(familyName)}`);
  };

  const handleLanguageToggle = () => {
    setLanguage(language === "en" ? "ne" : "en");
  };
  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login', { replace: true });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not sign out. Please try again.');
    }
  };

  return (
    <header className="topbar fixed top-0 right-0 left-0 lg:left-72 z-30 border-b backdrop-blur-xl transition-all">
      <div className="h-full flex items-center justify-between gap-3 px-4 sm:px-6 lg:px-9">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label="Open navigation"
            className="topbar-icon-button lg:hidden h-10 w-10 rounded-xl flex items-center justify-center"
          >
            <Bars3Icon className="w-5 h-5" />
          </button>
          {/* <div className="min-w-0">
            <p className="hidden sm:block text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700">
              Katuwal Bansha Batika
            </p>
            <h2 className="truncate text-sm sm:text-[17px] font-semibold tracking-tight text-slate-800">
              {t(pageKey)}
            </h2>
          </div> */}
        </div>

        <form onSubmit={handleSearch} className="relative flex min-w-0 w-full max-w-md">
          <div className="relative min-w-0 w-full">
            <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[17px] w-[17px] text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(event) => { setSearch(event.target.value); setSearchOpen(true); }}
              onFocus={() => setSearchOpen(true)}
              placeholder={t("search_members_families")}
              aria-label={t("search_members_families")}
              className="h-10 w-full min-w-0 rounded-xl border border-slate-200/80 bg-slate-50/80 pl-10 pr-3 text-[13px] text-slate-700 placeholder:text-slate-400 outline-none transition focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 lg:pr-16"
            />
            <kbd className="absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] text-slate-400 lg:block">
              Ctrl K
            </kbd>
          </div>
          {searchOpen && search.trim().length >= 2 && (
            <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-96 overflow-auto rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
              {searching && <p className="px-3 py-2 text-xs text-slate-500">Searching…</p>}
              {!searching && searchResults?.members?.data?.length === 0 && searchResults?.families?.data?.length === 0 && (
                <p className="px-3 py-2 text-sm text-slate-500">No matching records.</p>
              )}
              {searchResults?.members?.data?.length > 0 && (
                <div>
                  <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Members</p>
                  {searchResults.members.data.map((member) => (
                    <button key={member._id} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => openMember(member._id)} className="block w-full rounded-lg px-3 py-2 text-left hover:bg-emerald-50">
                      <span className="block truncate text-sm font-medium text-slate-800">{member.name}</span>
                      <span className="block truncate text-xs text-slate-500">{member.familyNumber || member.family || ''} · {member.phone || member.email || ''}</span>
                    </button>
                  ))}
                </div>
              )}
              {searchResults?.families?.data?.length > 0 && (
                <div className="mt-1 border-t border-slate-100 pt-1">
                  <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Families</p>
                  {searchResults.families.data.map((family) => (
                    <button key={family._id} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => openFamily(family.familyName)} className="block w-full rounded-lg px-3 py-2 text-left hover:bg-emerald-50">
                      <span className="block truncate text-sm font-medium text-slate-800">{family.familyName}</span>
                      <span className="block truncate text-xs text-slate-500">{family.familyNumber} · {family.clan || ''}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </form>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={handleLanguageToggle}
            aria-label={language === "en" ? "Switch to Nepali" : "Switch to English"}
            className="topbar-icon-button h-10 min-w-10 rounded-xl px-2.5 flex items-center justify-center text-xs font-semibold"
          >
            {language === "en" ? "नेपाली" : "EN"}
          </button>

          {user?.role === 'admin' && <button
            type="button"
            onClick={() => navigate("/notifications")}
            aria-label={t("notifications")}
            className="topbar-icon-button relative h-10 w-10 rounded-xl flex items-center justify-center"
          >
            <BellIcon className="w-[18px] h-[18px]" />
          </button>}

          <button type="button" onClick={() => navigate('/profile')} className="hidden sm:flex items-center gap-2.5 border-l border-slate-200 pl-3 text-left">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white text-sm font-bold shadow-sm">
              {user?.photo ? <img src={user.photo} alt="" className="h-full w-full rounded-xl object-cover" /> : user?.name?.slice(0, 1)?.toUpperCase()}
            </div>
            <div className="hidden lg:block min-w-[92px] text-left">
              <p className="max-w-32 truncate text-xs font-semibold leading-4 text-slate-800">{user?.name}</p>
              <p className="text-[10px] capitalize text-slate-500">{user?.role}</p>
            </div>
          </button>
          <button type="button" onClick={handleSignOut} className="hidden rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 sm:block">
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
