import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAppStore } from '@/store/main';

// Import all required views
import GV_TopNav from '@/components/views/GV_TopNav';
import GV_Footer from '@/components/views/GV_Footer';
import GV_AuthModal from '@/components/views/GV_AuthModal';
import GV_PasswordRecoveryModal from '@/components/views/GV_PasswordRecoveryModal';
import GV_NotificationDropdown from '@/components/views/GV_NotificationDropdown';
import GV_ProfileDropdown from '@/components/views/GV_ProfileDropdown';
import UV_Landing from '@/components/views/UV_Landing';
import UV_Dashboard from '@/components/views/UV_Dashboard';
import UV_GreetingCreation from '@/components/views/UV_GreetingCreation';
import UV_GroupManagement from '@/components/views/UV_GroupManagement';
import UV_AdminDashboard from '@/components/views/UV_AdminDashboard';
import UV_Settings from '@/components/views/UV_Settings';
import UV_GreetingDetail from '@/components/views/UV_GreetingDetail';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

const LoadingSpinner: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
  </div>
);

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = useAppStore(state => state.auth_state.auth_status.is_authenticated);
  const isLoading = useAppStore(state => state.auth_state.auth_status.is_loading);
  
  if (isLoading) return <LoadingSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  
  return <>{children}</>;
};

const App: React.FC = () => {
  const isLoading = useAppStore(state => state.auth_state.auth_status.is_loading);
  const initializeAuth = useAppStore(state => state.initialize_auth);
  
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);
  
  if (isLoading) return <LoadingSpinner />;
  
  return (
    <Router>
      <QueryClientProvider client={queryClient}>
        <div className="App min-h-screen flex flex-col">
          <GV_TopNav />
          <main className="flex-1">
            <Routes>
              {/* Public Route */}
              <Route path="/" element={<UV_Landing />} />
              
              {/* Protected Routes */}
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <UV_Dashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/create-greeting" 
                element={
                  <ProtectedRoute>
                    <UV_GreetingCreation />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/groups/:groupId" 
                element={
                  <ProtectedRoute>
                    <UV_GroupManagement />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin" 
                element={
                  <ProtectedRoute>
                    <UV_AdminDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/settings" 
                element={
                  <ProtectedRoute>
                    <UV_Settings />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/greeting/:id" 
                element={
                  <ProtectedRoute>
                    <UV_GreetingDetail />
                  </ProtectedRoute>
                } 
              />
              
              {/* Catch-all route */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </main>
          <GV_Footer />
        </div>
      </QueryClientProvider>
    </Router>
  );
};

export default App;