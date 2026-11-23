import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { SocketProvider } from './context/SocketContext';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { OrganizationProvider } from './context/OrganizationContext';
import RequireAuth from './components/RequireAuth';
import Layout from './layouts/Layout';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import ForgotPassword from './pages/ForgotPassword';
import ChangePassword from './pages/ChangePassword';
import AccountProfile from './pages/AccountProfile';
import AdminUsers from './pages/AdminUsers';
import Dashboard from './pages/Dashboard';
import Members from './pages/Members';
import Families from './pages/Families';
import FamilyTree from './pages/FamilyTreePage';
import DataEntry from './pages/DataEntry';
import Notifications from './pages/Notifications';
import Reports from './pages/Reports';
import Donations from './pages/Donations';
import Chat from './pages/Chat';
import Documents from './pages/Documents';
import Backups from './pages/Backups';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
});

const PublicOnly = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-8 text-center text-sm text-slate-600">Loading your account...</div>;
  if (user) return <Navigate to="/" replace />;
  return children;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <AuthProvider>
          <OrganizationProvider>
            <SocketProvider>
              <Router>
              <Routes>
                <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
                <Route path="/signup" element={<PublicOnly><SignUp /></PublicOnly>} />
                <Route path="/forgot-password" element={<PublicOnly><ForgotPassword /></PublicOnly>} />

                <Route path="/" element={<RequireAuth><Layout><Outlet /></Layout></RequireAuth>}>
                  <Route index element={<Dashboard />} />
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="members" element={<Members />} />
                  <Route path="families" element={<Families />} />
                  <Route path="family-tree" element={<FamilyTree />} />
                  <Route path="data-entry" element={<RequireAuth roles={['admin', 'staff']}><DataEntry /></RequireAuth>} />
                  <Route path="notifications" element={<Notifications />} />
                  <Route path="reports" element={<Reports />} />
                  <Route path="donations" element={<RequireAuth roles={['admin', 'staff']}><Donations /></RequireAuth>} />
                  <Route path="chat" element={<RequireAuth roles={['admin', 'staff', 'user']}><Chat /></RequireAuth>} />
                  <Route path="documents" element={<RequireAuth roles={['admin', 'user']}><Documents /></RequireAuth>} />
                  <Route path="backups" element={<RequireAuth roles={['admin']}><Backups /></RequireAuth>} />
                  <Route path="settings" element={<RequireAuth roles={['admin', 'staff', 'user']}><Settings /></RequireAuth>} />
                  <Route path="change-password" element={<ChangePassword />} />
                  <Route path="profile" element={<AccountProfile />} />
                  <Route path="admin/users" element={<RequireAuth roles={['admin']}><AdminUsers /></RequireAuth>} />
                  <Route path="*" element={<NotFound />} />
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
        </OrganizationProvider>
      </AuthProvider>
    </LanguageProvider>
    </QueryClientProvider>
  );
}

export default App;
