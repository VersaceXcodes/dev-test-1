import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/store/main';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { dateFns } from 'date-fns'; // Hypothetical date library
import {
  UserEntity,
  GreetingEntity,
  AdminReport,
  UpdateUserInput
} from '@/types';

const UV_AdminDashboard: React.FC = () => {
  // Zustand State
  const fetchAdminReports = useAppStore(state => state.fetch_admin_reports);
  const deleteUser = useAppStore(state => state.delete_user);
  const selectAdminUser = useAppStore(state => state.select_admin_user);
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const isLoadingAuth = useAppStore(state => state.authentication_state.auth_status.is_loading);
  const isAuthenticated = useAppStore(state => state.authentication_state.auth_status.is_authenticated);

  // Query State
  const [dateMin, setDateMin] = useState<string>('');
  const [dateMax, setDateMax] = useState<string>('');
  const [filterUserId, setFilterUserId] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<UserEntity | null>(null);

  // Query for Admin Reports
  const {
    data: adminData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['admin-reports', dateMin, dateMax, filterUserId],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}api/admin/reports`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${currentUser?.auth_token}`,
        },
        params: {
          date_min: dateMin,
          date_max: dateMax,
          user_id: filterUserId,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch admin reports');
      }

      return response.json() as Promise<AdminReport>;
    },
  });

  // Mutation for Deleting User
  const { mutate: mutateDeleteUser } = useMutation({
    mutationFn: (userId: string) => {
      return fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}api/users/${userId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${currentUser?.auth_token}`,
        },
      });
    },
    onSuccess: () => {
      refetch();
    },
  });

  // Handle date range changes
  const handleDateFilterChange = (dateRange: { startDate: Date | null; endDate: Date | null }) => {
    if (dateRange.startDate && dateRange.endDate) {
      setDateMin(dateFns.format(dateRange.startDate, 'yyyy-MM-dd'));
      setDateMax(dateFns.format(dateRange.endDate, 'yyyy-MM-dd'));
    } else {
      setDateMin('');
      setDateMax('');
    }
  };

  // Handle user filter change
  const handleUserFilterChange = (userId: string) => {
    setFilterUserId(userId);
  };

  // User deletion handler
  const handleDeleteUser = (userId: string) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      mutateDeleteUser(userId);
    }
  };

  // User selection handler
  const handleSelectUser = (user: UserEntity) => {
    selectAdminUser(user);
    setSelectedUser(user);
  };

  // Render Loading State
  if (isLoading || isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-12 w-12 border-4 border-blue-600 rounded-full"></div>
      </div>
    );
  }

  // Render Error State
  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-lg">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Error Loading Data</h2>
            <p className="text-gray-700">{error instanceof Error? error.message : 'Unknown error'}</p>
            <button
              onClick={refetch}
              className="mt-6 inline-flex items-center px-4 py-2 border border-red-500 text-red-500 rounded-md hover:bg-red-50 focus:outline-none"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <h1 className="text-xl font-semibold text-gray-900">Admin Dashboard</h1>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => window.location.href = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/admin/users?format=csv`}
                className="text-blue-600 hover:text-blue-500 px-3 py-2 rounded-md text-sm font-medium"
              >
                Export CSV
              </button>
              <Link
                to="/settings"
                className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Account Settings
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-10 sm:px-6 lg:px-8">
        {/* Analytics Panel */}
        <section className="space-y-8">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold text-gray-800">Analytics</h2>
            <div className="mt-6">
              <div className="flex gap-4">
                <div className="flex-1">
                  <p className="text-gray-600">Active Users (7-day trend)</p>
                  {/* Placeholder for chart */}
                  <div className="h-40 bg-gray-50 rounded-md border border-gray-200"></div>
                </div>
                <div className="flex-1">
                  <p className="text-gray-600">Greeting Volume</p>
                  {/* Placeholder for chart */}
                  <div className="h-40 bg-gray-50 rounded-md border border-gray-200"></div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Filters */}
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-lg font-medium text-gray-800">Filters</h3>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Date Range Picker (hypothetical component) */}
              <DateRangePicker
                startDate={dateMin? new Date(dateMin) : null}
                endDate={dateMax? new Date(dateMax) : null}
                onChange={handleDateFilterChange}
              />
              {/* User Filter */}
              <div>
                <label htmlFor="userFilter" className="block text-sm font-medium text-gray-700">
                  Filter by User
                </label>
                <input
                  id="userFilter"
                  type="text"
                  value={filterUserId}
                  onChange={(e) => handleUserFilterChange(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter User ID"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Moderation Queue */}
        <section className="bg-white p-6 rounded-lg shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Moderation Queue</h2>
            <span className="text-sm text-gray-500">
              {adminData?.reported_greetings?.length || 0} items
            </span>
          </div>
          
          <div className="space-y-4">
            {adminData?.reported_greetings?.map((greeting) => (
              <div
                key={greeting.id}
                className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-center">
                  <div className="flex-1">
                    <p className="text-sm text-gray-600">From: {greeting.sender_id}</p>
                    <p className="text-sm text-gray-600">To: {greeting.recipient_id}</p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleModerationAction(greeting.id, 'approved')}
                      className="text-green-600 hover:text-green-500"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.5 3a1 1 0 11-2 0 1 1 0 012 0zm-4.5 6.5a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zm-6-2.5V4a1 1 0 00-1-1V3a1 1 0 100 2v10a6 6 0 1112 0 6 6 0 01-12 0zM4.5 7.5a4.5 4.5 0 018 0 4.5 4.5 0 01-18 0zM7.5 17a1 1 0 100-2 1 1 0 000 2zm5 0a1 1 0 100-2 1 1 0 000 2z" />
                    </svg>
                    <span className="sr-only">Approve</span>
                    </button>
                    <button
                      onClick={() => handleModerationAction(greeting.id, 'deleted')}
                      className="text-red-600 hover:text-red-500"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v12a1 1 0 001 1h8a1 1 0 100-2V4h3a1 1 0 100-2H8v2a2 2 0 104.728.002L12.5 6.5l3.5-3.5a1 1 0 000-1.414l-3.5 3.5a1 1 0 00.293.803A8.969 8.969 0 012 2.75a8.969 8.969 0 019 0 8.969 8.969 0 011 0 8.969 8.969 0 01-11.991 0zM7 14a1 1 0 012 0 1 1 0 110 0zm4 0a1 1 0 012 0 1 1 0 110 0zM6 7a1 1 0 015 0v6a1 1 0 11-2 0V7z" />
                      </svg>
                      <span className="sr-only">Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="mt-2 text-sm text-gray-500">
                  {greeting.content?.text || 'No content'}
                </div>
              </div>
            ))}
            
            {adminData?.reported_greetings?.length === 0 && (
              <div className="p-4 text-center text-gray-500">
                No reported greetings found
              </div>
            )}
          </div>
        </section>

        {/* User Management */}
        <section className="bg-white p-6 rounded-lg shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">User Management</h2>
          </div>
          
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search users..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              onChange={(e) => handleUserFilterChange(e.target.value)}
            />
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    ID
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Name
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Email
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Role
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Status
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {adminData?.user_activity?.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap">{user.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{user.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{user.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{user.role}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex text-xs rounded-full ${
                          user.is_active
                           ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {user.is_active? 'Active' : 'Banned'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleSelectUser(user)}
                        className="text-blue-600 hover:text-blue-500 mr-2"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="text-red-600 hover:text-red-500"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                
                {adminData?.user_activity?.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center text-gray-500">
                      No users found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
};

// Placeholder for moderation action handling
const handleModerationAction = (greetingId: string, action: 'approved' | 'deleted') => {
  // Implement actual moderation logic here
  console.log(`Moderation action: ${action} on greeting ${greetingId}`);
};

export default UV_AdminDashboard;