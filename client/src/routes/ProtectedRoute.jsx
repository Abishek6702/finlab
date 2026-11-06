import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import AuthLoading from '../components/auth/AuthLoading';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <AuthLoading />;
  }

  if (!isAuthenticated) {
    // Preserve the original attempted location for seamless post-login redirect
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (location.pathname !== '/onboarding' && user?.onboardingCompleted === false) {
    return <Navigate to="/onboarding" replace />;
  }

  return children;
}

