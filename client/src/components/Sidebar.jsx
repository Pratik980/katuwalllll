// // // src/components/Sidebar.jsx
// // import { NavLink } from 'react-router-dom';
// // import {
// //   HomeIcon,
// //   UsersIcon,
// //   BuildingOfficeIcon,
// //   HeartIcon,
// //   GitBranch,
// //   DocumentIcon,
// //   ChatBubbleLeftIcon,
// //   BellIcon,
// //   ChartBarIcon,
// //   CogIcon,
// //   ArchiveBoxIcon,
// // } from '@heroicons/react/24/outline';

// // const navigation = [
// //   { name: 'Dashboard', href: '/', icon: HomeIcon },
// //   { name: 'Members', href: '/members', icon: UsersIcon },
// //   { name: 'Families', href: '/families', icon: BuildingOfficeIcon },
// //   { name: 'Donations', href: '/donations', icon: HeartIcon },
// //   { name: 'Family Tree', href: '/family-tree', icon: GitBranch },
// //   { name: 'Documents', href: '/documents', icon: DocumentIcon },
// //   { name: 'Chat', href: '/chat', icon: ChatBubbleLeftIcon },
// //   { name: 'Notifications', href: '/notifications', icon: BellIcon },
// //   { name: 'Reports', href: '/reports', icon: ChartBarIcon },
// //   { name: 'Backups', href: '/backups', icon: ArchiveBoxIcon },
// //   { name: 'Settings', href: '/settings', icon: CogIcon },
// // ];

// // const Sidebar = ({ isOpen, toggle }) => {
// //   return (
// //     <>
// //       {/* Mobile overlay */}
// //       {isOpen && (
// //         <div
// //           className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
// //           onClick={toggle}
// //         />
// //       )}

// //       {/* Sidebar */}
// //       <div
// //         className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out ${
// //           isOpen ? 'translate-x-0' : '-translate-x-full'
// //         } lg:translate-x-0`}
// //       >
// //         <div className="flex flex-col h-full">
// //           {/* Logo */}
// //           <div className="flex items-center h-16 px-6 border-b border-gray-200">
// //             <GitBranch className="h-8 w-8 text-primary" />
// //             <span className="ml-2 text-xl font-bold text-gray-800">
// //               Family Tree
// //             </span>
// //           </div>

// //           {/* Navigation */}
// //           <nav className="flex-1 px-4 py-4 overflow-y-auto">
// //             <ul className="space-y-1">
// //               {navigation.map((item) => (
// //                 <li key={item.name}>
// //                   <NavLink
// //                     to={item.href}
// //                     className={({ isActive }) =>
// //                       `flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-colors duration-150 ${
// //                         isActive
// //                           ? 'bg-primary text-white'
// //                           : 'text-gray-700 hover:bg-gray-100'
// //                       }`
// //                     }
// //                   >
// //                     <item.icon className="h-5 w-5 mr-3" />
// //                     {item.name}
// //                   </NavLink>
// //                 </li>
// //               ))}
// //             </ul>
// //           </nav>

// //           {/* Footer */}
// //           <div className="p-4 border-t border-gray-200">
// //             <p className="text-xs text-gray-500 text-center">
// //               © 2026 Family Tree System
// //             </p>
// //           </div>
// //         </div>
// //       </div>
// //     </>
// //   );
// // };

// // export default Sidebar;

// import { NavLink } from "react-router-dom";
// import {
//   XMarkIcon,
//   Squares2X2Icon,
//   UsersIcon,
//   // BuildingOffice2Icon,
//   HeartIcon,
//   // Shareicon,
//   DocumentTextIcon,
//   ChatBubbleLeftRightIcon,
//   BellIcon,
//   ChartBarSquareIcon,
//   ArchiveBoxIcon,
//   Cog6ToothIcon,
// } from "@heroicons/react/24/outline";
// import {
//   GitBranch,
//   UserPlus,
//   // Network,
//   // Waypoints,
//   // Workflow,
//   // Share2,
// } from "lucide-react";

// const navigation = [
//   {
//     name: "Dashboard",
//     href: "/",
//     icon: Squares2X2Icon,
//   },
//   {
//     name: "Members",
//     href: "/members",
//     icon: UsersIcon,
//   },
//   {
//     name: "DataEntry",
//     href: "/data-entry",
//     icon: UserPlus,
//   },
//   {
//     name: "Donations",
//     href: "/donations",
//     icon: HeartIcon,
//   },
//    {
//     name: "Families",
//     href: "/families",
//     icon: GitBranch,
//   },
//   {
//     name: "Family Tree",
//     href: "/family-tree",
//     icon: GitBranch,
//   },
//   {
//     name: "Documents",
//     href: "/documents",
//     icon: DocumentTextIcon,
//   },
//   {
//     name: "Chat",
//     href: "/chat",
//     icon: ChatBubbleLeftRightIcon,
//   },
//   {
//     name: "Notifications",
//     href: "/notifications",
//     icon: BellIcon,
//   },
//   {
//     name: "Reports",
//     href: "/reports",
//     icon: ChartBarSquareIcon,
//   },
//   {
//     name: "Backups",
//     href: "/backups",
//     icon: ArchiveBoxIcon,
//   },
//   {
//     name: "Settings",
//     href: "/settings",
//     icon: Cog6ToothIcon,
//   },
// ];

// export default function Sidebar({ isOpen, toggle }) {
//   return (
//     <>
//       {/* Mobile Overlay */}
//       {isOpen && (
//         <div
//           onClick={toggle}
//           className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
//         />
//       )}

//       {/* Sidebar */}
//       <aside
//         className={`fixed top-0 left-0 z-50 h-screen w-72 bg-white border-r border-slate-200 shadow-xl transition-transform duration-300 ease-in-out
//         ${isOpen ? "translate-x-0" : "-translate-x-full"}
//         lg:translate-x-0`}
//       >
//         <div className="flex flex-col h-full">

//           {/* Logo */}
//           <div className="h-16 border-b border-slate-200 flex items-center justify-between px-6">

//             <div className="flex items-center gap-3">

//               <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">

//                 <GitBranch className="h-6 w-6 text-white" />

//               </div>

//               <div>

//                 <h1 className="font-bold text-lg text-slate-800">
//                   Katuwal Bansha
//                 </h1>

//                 <p className="text-xs text-slate-500">
//                   Management System
//                 </p>

//               </div>

//             </div>

//             <button
//               onClick={toggle}
//               className="lg:hidden rounded-lg p-2 hover:bg-slate-100"
//             >
//               <XMarkIcon className="h-6 w-6" />
//             </button>

//           </div>

//           {/* Navigation */}
//           <nav className="flex-1 overflow-y-auto px-4 py-6">

//             <ul className="space-y-2">

//               {navigation.map((item) => (
//                 <li key={item.name}>
//                   <NavLink
//                     to={item.href}
//                     end={item.href === "/"}
//                     className={({ isActive }) =>
//                       `group flex items-center gap-4 rounded-xl px-4 py-3 transition-all duration-200
//                       ${
//                         isActive
//                           ? "bg-gradient-to-r from-green-600 to-emerald-500 text-white shadow-lg"
//                           : "text-slate-700 hover:bg-slate-100 hover:text-green-600"
//                       }`
//                     }
//                   >
//                     <item.icon className="h-6 w-6 flex-shrink-0" />

//                     <span className="font-medium">
//                       {item.name}
//                     </span>
//                   </NavLink>
//                 </li>
//               ))}

//             </ul>

//           </nav>

//           {/* Bottom Card */}
//           <div className="p-5 border-t border-slate-200">

//             <div className="rounded-2xl bg-gradient-to-r from-green-600 to-emerald-500 p-4 text-white shadow-lg">

//               <h3 className="font-semibold">
//                 Katuwal Bansha Batika is Family Tree System
//               </h3>

//               <p className="text-sm mt-1 text-green-100">
//                 Modern Digital Genealogy Platform
//               </p>

//             </div>

//             <p className="text-center text-xs text-slate-400 mt-5">
//               © 2026 NDS Software
//             </p>

//           </div>

//         </div>
//       </aside>
//     </>
//   );
// }
// src/components/Sidebar.jsx - WITHOUT THEME
import { NavLink } from "react-router-dom";
import {
  XMarkIcon,
  Squares2X2Icon,
  UsersIcon,
  HeartIcon,
  DocumentTextIcon,
  ChatBubbleLeftRightIcon,
  BellIcon,
  ChartBarSquareIcon,
  ArchiveBoxIcon,
  Cog6ToothIcon,
  UserCircleIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import {
  GitBranch,
  UserPlus,
} from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";

const navigationItems = [
  { key: 'dashboard', href: "/", icon: Squares2X2Icon },
  { key: 'members', href: "/members", icon: UsersIcon },
  { key: 'families', href: "/families", icon: GitBranch },
  { key: 'family_tree', href: "/family-tree", icon: GitBranch },
  { key: 'chat', href: "/chat", icon: ChatBubbleLeftRightIcon },
  { key: 'settings', href: "/settings", icon: Cog6ToothIcon },
];

export default function Sidebar({ isOpen, toggle }) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const roleItems = [
    ...navigationItems,
    ...(user?.role === 'admin' || user?.role === 'staff'
      ? [{ key: 'data_entry', href: "/data-entry", icon: UserPlus }]
      : []),
    { key: 'reports', href: "/reports", icon: ChartBarSquareIcon },
    ...(user?.role === 'admin' ? [
      { key: 'documents', href: "/documents", icon: DocumentTextIcon },
    ] : []),
    ...(user?.role === 'admin' ? [
      { key: 'donations', href: "/donations", icon: HeartIcon },
      { key: 'notifications', href: "/notifications", icon: BellIcon },
      { key: 'backups', href: "/backups", icon: ArchiveBoxIcon },
      { key: 'admin_users', href: "/admin/users", icon: UserGroupIcon, label: 'User management' },
    ] : []),
    { key: 'profile', href: "/profile", icon: UserCircleIcon, label: 'Profile' },
  ];

  return (
    <>
      {isOpen && (
        <div
          onClick={toggle}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      <aside
        className={`sidebar-panel fixed top-0 left-0 z-50 h-screen w-72 border-r transition-transform duration-300 ease-in-out
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      >
        <div className="flex flex-col h-full">
          <div className="h-[4.5rem] border-b border-slate-100 flex items-center justify-between px-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center shadow-md shadow-emerald-900/15">
                <GitBranch className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-[15px] leading-tight tracking-tight text-slate-800">
                  {t('app_name')}
                </h1>
                <p className="text-[11px] text-slate-500 mt-0.5">
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

          <nav aria-label="Main navigation" className="flex-1 overflow-y-auto px-3 py-6">
            <p className="page-eyebrow px-3 pb-3">Workspace</p>
            <ul className="space-y-1">
              {roleItems.map((item) => {
                const Icon = item.icon;
                const label = item.label || t(item.key);
                return (
                  <li key={item.key}>
                    <NavLink
                      to={item.href}
                      end={item.href === "/"}
                      className={({ isActive }) =>
                        `sidebar-link group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13px] transition-all duration-200
                        ${
                          isActive
                            ? "bg-emerald-50 font-semibold text-emerald-800 ring-1 ring-emerald-100"
                            : "font-medium text-slate-600 hover:bg-slate-50 hover:text-emerald-800"
                        }`
                      }
                    >
                      <Icon className="h-[18px] w-[18px] flex-shrink-0 opacity-85" />
                      <span className="font-medium">{label}</span>
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="p-4 border-t border-slate-100">
            <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-4">
              <div className="mb-2 flex items-center gap-2">
                  <GitBranch className="h-3.5 w-3.5 text-emerald-700" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-800">Genealogy workspace</span>
              </div>
              <h3 className="text-xs font-semibold leading-relaxed text-slate-700">{t('app_description_short')}</h3>
              <p className="mt-1 text-[11px] text-slate-500">{t('digital_genealogy')}</p>
            </div>
            <p className="text-center text-[10px] text-slate-400 mt-4">
              © 2026 NDS Software
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}

// // src/components/Sidebar.jsx - COMPLETE
// import { NavLink } from "react-router-dom";
// import {
//   XMarkIcon,
//   Squares2X2Icon,
//   UsersIcon,
//   HeartIcon,
//   DocumentTextIcon,
//   ChatBubbleLeftRightIcon,
//   BellIcon,
//   ChartBarSquareIcon,
//   ArchiveBoxIcon,
//   Cog6ToothIcon,
// } from "@heroicons/react/24/outline";
// import {
//   GitBranch,
//   UserPlus,
// } from "lucide-react";
// import { useTheme } from "../context/ThemeContext";
// import { useLanguage } from "../context/LanguageContext";

// const navigationItems = [
//   { key: 'dashboard', href: "/", icon: Squares2X2Icon },
//   { key: 'members', href: "/members", icon: UsersIcon },
//   { key: 'data_entry', href: "/data-entry", icon: UserPlus },
//   { key: 'donations', href: "/donations", icon: HeartIcon },
//   { key: 'families', href: "/families", icon: GitBranch },
//   { key: 'family_tree', href: "/family-tree", icon: GitBranch },
//   { key: 'documents', href: "/documents", icon: DocumentTextIcon },
//   { key: 'chat', href: "/chat", icon: ChatBubbleLeftRightIcon },
//   { key: 'notifications', href: "/notifications", icon: BellIcon },
//   { key: 'reports', href: "/reports", icon: ChartBarSquareIcon },
//   { key: 'backups', href: "/backups", icon: ArchiveBoxIcon },
//   { key: 'settings', href: "/settings", icon: Cog6ToothIcon },
// ];

// export default function Sidebar({ isOpen, toggle }) {
//   const { isDark } = useTheme();
//   const { t } = useLanguage();

//   return (
//     <>
//       {isOpen && (
//         <div
//           onClick={toggle}
//           className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
//         />
//       )}

//       <aside
//         className={`fixed top-0 left-0 z-50 h-screen w-72 bg-white dark:bg-gray-900 border-r border-slate-200 dark:border-slate-700 shadow-xl transition-transform duration-300 ease-in-out
//         ${isOpen ? "translate-x-0" : "-translate-x-full"}
//         lg:translate-x-0`}
//       >
//         <div className="flex flex-col h-full">
//           {/* Logo */}
//           <div className="h-16 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-6">
//             <div className="flex items-center gap-3">
//               <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
//                 <GitBranch className="h-6 w-6 text-white" />
//               </div>
//               <div>
//                 <h1 className="font-bold text-lg text-slate-800 dark:text-white">
//                   {t('app_name')}
//                 </h1>
//                 <p className="text-xs text-slate-500 dark:text-slate-400">
//                   {t('management_system')}
//                 </p>
//               </div>
//             </div>
//             <button
//               onClick={toggle}
//               className="lg:hidden rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800"
//             >
//               <XMarkIcon className="h-6 w-6 text-slate-700 dark:text-slate-300" />
//             </button>
//           </div>

//           {/* Navigation */}
//           <nav className="flex-1 overflow-y-auto px-4 py-6">
//             <ul className="space-y-2">
//               {navigationItems.map((item) => {
//                 const Icon = item.icon;
//                 const label = t(item.key);
//                 return (
//                   <li key={item.key}>
//                     <NavLink
//                       to={item.href}
//                       end={item.href === "/"}
//                       className={({ isActive }) =>
//                         `group flex items-center gap-4 rounded-xl px-4 py-3 transition-all duration-200
//                         ${
//                           isActive
//                             ? "bg-gradient-to-r from-green-600 to-emerald-500 text-white shadow-lg"
//                             : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-green-600 dark:hover:text-green-400"
//                         }`
//                       }
//                     >
//                       <Icon className="h-6 w-6 flex-shrink-0" />
//                       <span className="font-medium">{label}</span>
//                     </NavLink>
//                   </li>
//                 );
//               })}
//             </ul>
//           </nav>

//           {/* Bottom Card */}
//           <div className="p-5 border-t border-slate-200 dark:border-slate-700">
//             <div className="rounded-2xl bg-gradient-to-r from-green-600 to-emerald-500 p-4 text-white shadow-lg">
//               <h3 className="font-semibold">{t('app_description_short')}</h3>
//               <p className="text-sm mt-1 text-green-100">{t('digital_genealogy')}</p>
//             </div>
//             <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-5">
//               © 2026 NDS Software
//             </p>
//           </div>
//         </div>
//       </aside>
//     </>
//   );
// }