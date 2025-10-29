import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/store/main';
import { Link } from 'react-router-dom';

const GV_AuthModal: React.FC = () => {
  // Zustand store access
  const isLoading = useAppStore(state => state.auth_state.auth_status.is_loading);
  const errorMessage = useAppStore(state => state.auth_state.error_message);
  const clearAuthError = useAppStore(state => state.clear_auth_error);
  const loginUser = useAppStore(state => state.login_user);
  const registerUser = useAppStore(state => state.register_user);

  // Local form state
  const [isSignupTab, setIsSignupTab] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailAvailable, setEmailAvailable] = useState(true);
  const [emailChecking, setEmailChecking] = useState(false);

  // Form validation
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const passwordValid = password.length >= 8;
  const nameValid = name.trim().length > 0;
  const canSubmit = isSignupTab 
   ? emailValid && passwordValid && nameValid 
    : emailValid && passwordValid;

  // Handle tab change
  const toggleTab = (tab: boolean) => {
    clearAuthError();
    setIsSignupTab(tab);
    setEmail('');
    setPassword('');
    setName('');
  };

  // Email availability check (client-side only in this implementation)
  useEffect(() => {
    if (!email || emailChecking) return;
    
    const timeout = setTimeout(() => {
      // In a real implementation, this would call an API endpoint
      setEmailAvailable(true);
      setEmailChecking(false);
    }, 500);
    
    return () => clearTimeout(timeout);
  }, [email]);

  // Form submission handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearAuthError();
    
    try {
      if (isSignupTab) {
        await registerUser(email, password, name);
      } else {
        await loginUser(email, password);
      }
    } catch (error) {
      console.error('Authentication error:', error);
    }
  };

  return (
    <>
      {/* Modal Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40"></div>
      
      {/* Modal Container */}
      <div className="fixed inset-0 z-50 flex items-center justify-center min-h-screen">
        <div className="relative bg-white rounded-xl shadow-lg w-full max-w-md p-6 sm:p-8">
          {/* Close Button */}
          <button 
            type="button"
            className="absolute right-4 top-4 p-1"
            onClick={() => {
              clearAuthError();
              setIsSignupTab(false);
              setEmail('');
              setPassword('');
              setName('');
            }}
          >
            &times;
          </button>
          
          {/* Tab Navigation */}
          <div className="flex justify-center mb-6">
            <button
              className={`px-4 py-2 ${isSignupTab? 'border-b-2 border-blue-600 text-blue-600' : 'border-b border-gray-300 text-gray-600'} rounded-tl-md focus:outline-none`}
              onClick={() => toggleTab(false)}
            >
              Login
            </button>
            <button
              className={`px-4 py-2 ${isSignupTab? 'border-b-2 border-blue-600 text-blue-600' : 'border-b border-gray-300 text-gray-600'} rounded-tr-md focus:outline-none`}
              onClick={() => toggleTab(true)}
            >
              Sign Up
            </button>
          </div>
          
          {/* Error Message */}
          {errorMessage && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
              <p className="text-sm">{errorMessage}</p>
            </div>
          )}
          
          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  clearAuthError();
                }}
                placeholder="you@example.com"
                className="relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
              />
              {email &&!emailValid && (
                <p className="text-red-500 text-sm mt-1">Please enter a valid email address</p>
              )}
              {emailChecking && (
                <p className="text-blue-500 text-sm mt-1">Checking availability...</p>
              )}
              {!emailChecking && email &&!emailAvailable && (
                <p className="text-red-500 text-sm mt-1">This email is already taken</p>
              )}
            </div>
            
            {/* Password Field */}
            <div>
              <div className="flex justify-between items-center">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <button
                  type="button"
                  className="text-sm text-blue-600 hover:text-blue-500"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword? 'Hide' : 'Show'}
                </button>
              </div>
              <input
                id="password"
                name="password"
                type={showPassword? 'text' : 'password'}
                autoComplete={isSignupTab? "new-password" : "current-password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  clearAuthError();
                }}
                placeholder="•••••••"
                className="relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
              />
              {password &&!passwordValid && (
                <p className="text-red-500 text-sm mt-1">Password must be at least 8 characters</p>
              )}
            </div>
            
            {/* Name Field (Signup Only) */}
            {isSignupTab && (
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    clearAuthError();
                  }}
                  placeholder="John Doe"
                  className="relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                />
                {name && name.trim().length < 2 && (
                  <p className="text-red-500 text-sm mt-1">Name must be at least 2 characters</p>
                )}
              </div>
            )}
            
            {/* Submit Button */}
            <div className="pt-6">
              <button
                type="submit"
                disabled={!canSubmit || isLoading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="absolute right-3 top-1" style={{ display: isLoading? 'block' : 'none' }}>
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </span>
                {isSignupTab? 'Create Account' : 'Sign In'}
              </button>
            </div>
            
            {/* Social Login */}
            <div className="mt-6 text-center">
              <p className="text-gray-600 text-sm">Or continue with</p>
              <div className="flex justify-center mt-3 space-x-4">
                <button 
                  type="button"
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md text-sm"
                >
                  Google
                </button>
                <button 
                  type="button"
                  className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-md text-sm"
                >
                  Facebook
                </button>
              </div>
            </div>
            
            {/* Footer Links */}
            <div className="mt-6 text-center text-sm">
              {isSignupTab? (
                <p className="text-gray-600">
                  Already have an account?{' '}
                  <button
                    type="button"
                    className="text-blue-600 hover:text-blue-500 font-medium"
                    onClick={() => toggleTab(false)}
                  >
                    Sign In
                  </button>
                </p>
              ) : (
                <p className="text-gray-600">
                  Don't have an account?{' '}
                  <button
                    type="button"
                    className="text-blue-600 hover:text-blue-500 font-medium"
                    onClick={() => toggleTab(true)}
                  >
                    Sign Up
                  </button>
                </p>
              )}
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default GV_AuthModal;