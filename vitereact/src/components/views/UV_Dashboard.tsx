import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '@/store/main';
import { v4 as uuidv4 } from 'uuid';
import { dateFns } from 'date-fns';

// Helper function to format date
const formatDate = (date: string | null) => {
  if (!date) return 'N/A';
  return dateFns.format(new Date(date), 'MMM d, yyyy HH:mm');
};

const UV_Dashboard: React.FC = () => {
  // Zustand state and actions
  const currentTab = useAppStore(state => state.greetings_state.current_tab);
  const greetings = useAppStore(state => state.greetings_state.greetings);
  const setGreetingTab = useAppStore(state => state.set_greetings_tab);
  const fetchGreetings = useAppStore(state => state.fetch_greetings);
  const deleteGreeting = useAppStore(state => state.delete_greeting);
  const searchQuery = useAppStore(state => state.greetings_state.search_query);
  const setGreetingSearch = useAppStore(state => state.set_greeting_search);
  const isLoading = useAppStore(state => state.greetings_state.is_fetching);
  const totalGreetings = useAppStore(state => state.greetings_state.total_greetings);
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const logoutUser = useAppStore(state => state.logout_user);

  // Local state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedGreetingId, setSelectedGreetingId] = useState<string>('');
  const [searchParams, setSearchParams] = useState({
    recipient_id: '',
    date_min: '',
    date_max: '',
    search_query: searchQuery
  });

  // Effect to fetch greetings on mount or when filters change
  useEffect(() => {
    const params = {
      tab: currentTab,
      recipient_id: searchParams.recipient_id,
      date_min: searchParams.date_min,
      date_max: searchParams.date_max,
      search_query: searchParams.search_query
    };
    fetchGreetings(params);
  }, [currentTab, searchParams, fetchGreetings]);

  // Handle tab change
  const handleTabChange = (tab: 'sent' | 'received' | 'drafts') => {
    setGreetingTab(tab);
    // Update URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    urlParams.set('tab', tab);
    window.history.replaceState({}, '', `${window.location.pathname}?${urlParams.toString()}`);
  };

  // Handle search input changes
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setGreetingSearch(newQuery);
    setSearchParams(prev => ({...prev, search_query: newQuery }));
  };

  // Handle date range changes
  const handleDateChange = (type: 'min' | 'max', date: string) => {
    setSearchParams(prev => ({
     ...prev,
     ...(type === 'min'? { date_min: date } : { date_max: date })
    }));
  };

  // Handle delete confirmation
  const handleDelete = (id: string) => {
    setShowDeleteModal(true);
    setSelectedGreetingId(id);
  };

  // Confirm delete
  const confirmDelete = () => {
    deleteGreeting(selectedGreetingId);
    setShowDeleteModal(false);
  };

  // Render status badge
  const statusBadge = (status: string) => {
    switch(status) {
      case 'sent':
        return <span className="inline-flex items-center px-3 py-0.5 text-white rounded-full text-sm font-medium bg-green-100 border border-green-800 dark:border-green-700 dark:bg-green-800 dark:text-green-100">Sent</span>;
      case 'pending':
        return <span className="inline-flex items-center px-3 py-0.5 text-white rounded-full text-sm font-medium bg-yellow-100 border border-yellow-800 dark:border-yellow-700 dark:bg-yellow-800 dark:text-yellow-100">Draft</span>;
      case 'delivered':
        return <span className="inline-flex items-center px-3 py-0.5 text-white rounded-full text-sm font-medium bg-blue-100 border border-blue-800 dark:border-blue-700 dark:bg-blue-800 dark:text-blue-100">Delivered</span>;
      case 'failed':
        return <span className="inline-flex items-center px-3 py-0.5 text-white rounded-full text-sm font-medium bg-red-100 border border-red-800 dark:border-red-700 dark:bg-red-800 dark:text-red-100">Failed</span>;
      default:
        return null;
    }
  };

  // Render greeting cards
  const renderGreetings = () => {
    if (isLoading && greetings.length === 0) {
      return <div className="text-center py-8">Loading...</div>;
    }
    if (!isLoading && greetings.length === 0) {
      return (
        <div className="text-center py-12">
          <svg className="mx-auto h-24 w-24 text-gray-300" fill="none" viewBox="0 0 24 24">
            <path d="M12 8v4m0 0v-4m-6 8a9 9 0 11-18 0 9 9 0 0118 0zM7 21a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <h2 className="mt-5 text-lg text-gray-700">No greetings found</h2>
          <p className="mt-2 text-gray-500">Use the button below to create your first greeting</p>
          <div className="mt-6">
            <Link
              to="/create-greeting"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Create Greeting
            </Link>
          </div>
        </div>
      );
    }
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {greetings.map(greeting => (
          <div key={greeting.id} className="group relative bg-white overflow-hidden shadow-lg rounded-xl">
            <div className="aspect-w-1 aspect-h-0.66">
              {/* Placeholder for media */}
              <div className="absolute inset-0 bg-gray-200" style={{ paddingTop: '66.25%' }}></div>
            </div>
            <div className="p-6">
              <div className="flex justify-between items-center">
                <h3 className="text-base font-medium text-gray-900 truncate">{greeting.content?.text || 'Untitled Greeting'}</h3>
                {statusBadge(greeting.status)}
              </div>
              <div className="mt-4 flex justify-between">
                <p className="text-sm text-gray-600">Sent on {formatDate(greeting.created_at)}</p>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleDelete(greeting.id)}
                    className="text-red-600 hover:text-red-500 focus:outline-none"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6V4m0 0a2 2 0 012 2v12a2 2 0 01-2 2m0-24V4a2 2 0 012 2v12a2 2 0 01-2 2m0-24V4m0 0a2 2 0 012 2v12a2 2 0 01-2 2m0-24V4" />
                  </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">Greetings Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link 
                to="/create-greeting"
                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                New Greeting
              </Link>
              <button
                onClick={logoutUser}
                className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="space-x-4">
            <button
              onClick={() => handleTabChange('sent')}
              className={`text-sm font-medium ${currentTab === 'sent'? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-700'}`}
            >
              Sent
            </button>
            <button
              onClick={() => handleTabChange('received')}
              className={`text-sm font-medium ${currentTab === 'received'? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-700'}`}
            >
              Received
            </button>
            <button
              onClick={() => handleTabChange('drafts')}
              className={`text-sm font-medium ${currentTab === 'drafts'? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-700'}`}
            >
              Drafts
            </button>
          </nav>
        </div>

        {/* Search/Filter Bar */}
        <div className="mt-8 p-4 bg-white rounded-lg shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="recipient" className="block text-sm font-medium text-gray-700">Recipient</label>
              <input
                type="text"
                id="recipient"
                value={searchParams.recipient_id}
                onChange={(e) => setSearchParams(prev => ({...prev, recipient_id: e.target.value }))}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Search by recipient"
              />
            </div>
            <div>
              <label htmlFor="date_min" className="block text-sm font-medium text-gray-700">From Date</label>
              <input
                type="date"
                id="date_min"
                value={searchParams.date_min}
                onChange={(e) => handleDateChange('min', e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label htmlFor="date_max" className="block text-sm font-medium text-gray-700">To Date</label>
              <input
                type="date"
                id="date_max"
                value={searchParams.date_max}
                onChange={(e) => handleDateChange('max', e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="search" className="block text-sm font-medium text-gray-700">Search Content</label>
              <input
                type="text"
                id="search"
                value={searchQuery}
                onChange={handleSearchChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Search greetings..."
              />
            </div>
          </div>
        </div>

        {/* Greeting Cards */}
        {renderGreetings()}

        {/* Load More Button */}
        {totalGreetings > greetings.length && (
          <div className="text-center mt-6">
            <button
              onClick={() => fetchGreetings({...searchParams, offset: greetings.length })}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded"
            >
              Load More
            </button>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white p-6 rounded-lg shadow-lg w-1/3">
              <h2 className="text-lg font-bold text-gray-900">Confirm Delete</h2>
              <p className="mt-2 text-gray-600">Are you sure you want to delete this greeting? This action cannot be undone.</p>
              <div className="mt-4 flex justify-end space-x-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="text-gray-600 hover:text-gray-500"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="text-red-600 hover:text-red-500 font-medium"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default UV_Dashboard;