import React, { useState } from 'react';
import axios from 'axios';
import { useAppStore } from '@/store/main';

const GV_PasswordRecoveryModal: React.FC = () => {
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  // Clear error when email changes
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRecoveryEmail(e.target.value);
    setError(null);
  };

  const handleSendResetLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Basic validation
    if (!recoveryEmail.trim()) {
      setError('Email is required');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recoveryEmail)) {
      setError('Invalid email address');
      return;
    }

    setIsLoading(true);

    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
      const response = await axios.post(
        `${apiBaseUrl}/api/auth/recover-password`,
        { email: recoveryEmail }
      );

      if (response.status === 200) {
        setSuccessMessage('A password recovery link has been sent to your email.');
        // Auto-close after 3 seconds
        setTimeout(() => {
          handleClose();
        }, 3000);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to send recovery link';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setError(null);
    setSuccessMessage(null);
    setRecoveryEmail('');
  };

  return (
    <>
      {/* Modal overlay */}
      {isOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          {/* Modal content */}
          <div className="relative w-full max-w-md mx-auto bg-white rounded-xl shadow-lg p-6">
            <div className="flex justify-end">
              <button 
                type="button"
                onClick={handleClose}
                className="text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                &times;
              </button>
            </div>
            
            <div className="mt-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Password Recovery
              </h2>
              
              {error && (
                <div className="bg-red-50 border border-red-200 p-3 rounded-md mb-4">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
              
              {successMessage && (
                <div className="bg-green-50 border border-green-200 p-3 rounded-md mb-4">
                  <p className="text-sm text-green-700">{successMessage}</p>
                </div>
              )}
              
              <form onSubmit={handleSendResetLink}>
                <div className="mb-6">
                  <label 
                    htmlFor="email" 
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Email address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={recoveryEmail}
                    onChange={handleEmailChange}
                    placeholder="Enter your email"
                    className="relative w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                  />
                </div>
                
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-1 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Sending...
                      </span>
                    ) : (
                      'Send Recovery Link'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default GV_PasswordRecoveryModal;