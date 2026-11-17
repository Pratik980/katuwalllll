// // src/App.jsx
// import React from 'react';
// import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
// import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// import { Toaster } from 'react-hot-toast';
// import { SocketProvider } from './context/SocketContext';
// import { ThemeProvider } from './context/ThemeContext';
// import { LanguageProvider } from './context/LanguageContext';
// import Layout from './layouts/Layout';
// import Dashboard from './pages/Dashboard';
// import Members from './pages/Members';
// import Families from './pages/Families';
// import Donations from './pages/Donations';
// import FamilyTree from './pages/FamilyTreePage';
// import DataEntry from './pages/DataEntry';
// import Documents from './pages/Documents';
// import Chat from './pages/Chat';
// import Notifications from './pages/Notifications';
// import Reports from './pages/Reports';
// import Settings from './pages/Settings';
// import Backups from './pages/Backups';

// const queryClient = new QueryClient({
//   defaultOptions: {
//     queries: {
//       refetchOnWindowFocus: false,
//       retry: 1,
//       staleTime: 5 * 60 * 1000,
//     },
//   },
// });

// function App() {
//   return (
//     <QueryClientProvider client={queryClient}>
//       <ThemeProvider>
//         <LanguageProvider>
//           <SocketProvider>
//             <Router>
//               <Layout>
//                 <Routes>
//                   <Route path="/" element={<Dashboard />} />
//                   <Route path="/dashboard" element={<Dashboard />} />
//                   <Route path="/members" element={<Members />} />
//                   <Route path="/families" element={<Families />} />
//                   <Route path="/donations" element={<Donations />} />
//                   <Route path="/family-tree" element={<FamilyTree />} />
//                   <Route path="/data-entry" element={<DataEntry />} />
//                   <Route path="/data-entry/:id" element={<DataEntry />} />
//                   <Route path="/documents" element={<Documents />} />
//                   <Route path="/chat" element={<Chat />} />
//                   <Route path="/notifications" element={<Notifications />} />
//                   <Route path="/reports" element={<Reports />} />
//                   <Route path="/settings" element={<Settings />} />
//                   <Route path="/backups" element={<Backups />} />
//                 </Routes>
//               </Layout>
//               <Toaster
//                 position="top-right"
//                 toastOptions={{
//                   duration: 3000,
//                   style: {
//                     background: '#363636',
//                     color: '#fff',
//                   },
//                 }}
//               />
//             </Router>
//           </SocketProvider>
//         </LanguageProvider>
//       </ThemeProvider>
//     </QueryClientProvider>
//   );
// }

// export default App;


// src/App.jsx - WITHOUT THEME
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Outlet, useNavigate, useParams } from 'react-router-dom';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { SocketProvider } from './context/SocketContext';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import Layout from './layouts/Layout';
import Dashboard from './pages/Dashboard';
import Members from './pages/Members';
import Families from './pages/Families';
import Donations from './pages/Donations';
import FamilyTree from './pages/FamilyTreePage';
import DataEntry from './pages/DataEntry';
import Documents from './pages/Documents';
import Chat from './pages/Chat';
import Notifications from './pages/Notifications';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Backups from './pages/Backups';
import { getMemberById } from './api/members';
import MemberProfile from './components/MemberProfile';
import PrintProfile from './components/PrintProfile';
import RequireAuth from './components/RequireAuth';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import ForgotPassword from './pages/ForgotPassword';
import ChangePassword from './pages/ChangePassword';
import AccountProfile from './pages/AccountProfile';
import AdminUsers from './pages/AdminUsers';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
});

function MemberProfileRoute({ print = false }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: member, isLoading, error } = useQuery({
    queryKey: ['member', id],
    queryFn: () => getMemberById(id),
  });

  if (isLoading) return <p>Loading member...</p>;
  if (error || !member) {
    return <p>Unable to load member{error?.message ? `: ${error.message}` : '.'}</p>;
  }

  return print
    ? <PrintProfile member={member} onClose={() => navigate(-1)} />
    : <MemberProfile member={member} />;
}

function ProtectedLayout() {
  return (
    <RequireAuth>
      <Layout><Outlet /></Layout>
    </RequireAuth>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LanguageProvider>
          <SocketProvider>
            <Router>
              <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<SignUp />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route element={<ProtectedLayout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/members" element={<Members />} />
                <Route path="/profile/:id" element={<MemberProfileRoute />} />
                <Route path="/profile/:id/print" element={<MemberProfileRoute print />} />
                <Route path="/profile" element={<AccountProfile />} />
                <Route path="/families" element={<Families />} />
                <Route path="/donations" element={<RequireAuth roles={['admin']}><Donations /></RequireAuth>} />
                <Route path="/family-tree" element={<FamilyTree />} />
                <Route path="/data-entry" element={<RequireAuth roles={['admin', 'staff']}><DataEntry /></RequireAuth>} />
                <Route path="/data-entry/:id" element={<RequireAuth roles={['admin', 'staff']}><DataEntry /></RequireAuth>} />
                <Route path="/documents" element={<RequireAuth roles={['admin']}><Documents /></RequireAuth>} />
                <Route path="/chat" element={<Chat />} />
                <Route path="/notifications" element={<RequireAuth roles={['admin']}><Notifications /></RequireAuth>} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/backups" element={<RequireAuth roles={['admin']}><Backups /></RequireAuth>} />
                <Route path="/change-password" element={<ChangePassword />} />
                <Route path="/admin/users" element={<RequireAuth roles={['admin']}><AdminUsers /></RequireAuth>} />
              </Route>
              </Routes>
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 3000,
                  style: {
                    background: '#363636',
                    color: '#fff',
                  },
                }}
              />
            </Router>
          </SocketProvider>
        </LanguageProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;