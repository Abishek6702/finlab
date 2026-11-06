import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import AuthLoading from '../components/auth/AuthLoading';

export default function PublicRoute({ children }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <AuthLoading />;
  }

  if (isAuthenticated) {
    if (user?.onboardingCompleted === false) return <Navigate to="/onboarding" replace />;
    // If user arrived from a protected page, navigate back there; otherwise go to dashboard/root
    const origin = location.state?.from?.pathname || '/dashboard';
    return <Navigate to={origin} replace />;
  }

  return children;
}

