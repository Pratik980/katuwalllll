import { useState, useEffect } from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const RequireAuth = ({ children, roles }) => {
  const { user, loading, initializationError } = useAuth();
  const location = useLocation();
  const [tookLong, setTookLong] = useState(false);

  useEffect(() => {
    let timer;
    if (loading) {
      timer = setTimeout(() => setTookLong(true), 6000);
    }
    return () => clearTimeout(timer);
  }, [loading]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center animate-fadeIn">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg mb-4">
          KB
        </div>
        <div className="animate-spin rounded-full h-8 w-8 border-3 border-emerald-600 border-t-transparent mb-3" />
        <h3 className="text-base font-bold text-slate-800">Connecting to Katuwal Bansha...</h3>
        <p className="text-xs text-slate-500 max-w-sm mt-1">
          Verifying your secure session.
        </p>

        {tookLong && (
          <div className="mt-4 p-3 bg-white rounded-xl border border-slate-200 shadow-xs max-w-sm text-xs space-y-2 animate-fadeIn">
            <p className="text-slate-600">
              The free server is currently waking up from idle mode. This usually takes 15–30 seconds.
            </p>
            <div className="flex justify-center gap-2 pt-1">
              <button
                onClick={() => window.location.reload()}
                className="px-3 py-1.5 bg-emerald-800 text-white rounded-lg font-medium hover:bg-emerald-700 transition"
              >
                Retry
              </button>
              <Link
                to="/login"
                className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition"
              >
                Go to Login
              </Link>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (user.mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default RequireAuth;
