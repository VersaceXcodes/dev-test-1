import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { useAppStore } from '@/store/main';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { GreetingEntity } from '@/store/main';
import { GreetingEntity as GreetingSchema } from '@/store/main';
import { z } from 'zod';

const UV_GreetingDetail: React.FC = () => {
  const { greeting_id } = useParams();
  const [replyContent, setReplyContent] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Get current user from store
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const auth_token = useAppStore(state => state.authentication_state.auth_token);
  const fetchGreetings = useAppStore(state => state.fetch_greetings);
  const deleteGreeting = useAppStore(state => state.delete_greeting);
  const setReplyContentState = useAppStore(state => state.set_greeting_search);

  // Fetch greeting data
  const { data: greeting, isLoading, isError, error } = useQuery({
    queryKey: ['greeting', greeting_id],
    queryFn: async () => {
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/greetings/${greeting_id}`,
        {
          headers: {
            Authorization: `Bearer ${auth_token}`,
          }
        }
      );
      return response.data;
    },
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  // Delete greeting mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await axios.delete(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/greetings/${id}`,
        {
          headers: {
            Authorization: `Bearer ${auth_token}`,
          }
        }
      );
      return response;
    },
    onSuccess: () => {
      fetchGreetings({ tab: 'sent' });
    },
  });

  // Reply to greeting mutation
  const replyMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/greetings/${greeting_id}/reply`,
        data,
        {
          headers: {
            Authorization: `Bearer ${auth_token}`,
          }
        }
      );
      return response;
    },
    onSuccess: () => {
      setReplyContent('');
    },
  });

  // Check if current user is the owner
  const isOwner = currentUser && greeting && currentUser.id === greeting.sender_id;

  // Handle delete confirmation
  const handleDelete = () => {
    if (showDeleteConfirm) {
      deleteMutation.mutate(greeting_id);
      setShowDeleteConfirm(false);
    } else {
      setShowDeleteConfirm(true);
    }
  };

  // Handle reply submission
  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!replyContent.trim()) return;

    try {
      await replyMutation.mutate({
        content: replyContent,
        sender_id: currentUser?.id || uuidv4(),
        recipient_type: greeting.recipient_type,
        recipient_id: greeting.recipient_id
      });
    } catch (error) {
      console.error('Reply failed:', error);
    }
  };

  // Handle media rendering
  const renderMedia = () => {
    if (!greeting ||!greeting.content?.media) return null;
    
    const media = greeting.content.media;
    const type = media.media_type?.split('/')[0].toLowerCase();
    
    switch (type) {
      case 'image':
        return (
          <div className="w-full max-w-2xl mx-auto overflow-hidden rounded-lg shadow-lg">
            <img src={media.url} alt="Greeting media" className="w-full h-auto" />
          </div>
        );
      case 'video':
        return (
          <div className="w-full max-w-2xl mx-auto overflow-hidden rounded-lg shadow-lg">
            <video controls className="w-full h-auto">
              <source src={media.url} type={media.media_type} />
              Your browser does not support the video tag.
            </video>
          </div>
        );
      default:
        return null;
    }
  };

  // Handle content rendering
  const renderContent = () => {
    if (!greeting ||!greeting.content?.text) return null;
    
    return (
      <div className="space-y-4">
        <div 
          className="prose prose-lg text-gray-700 dark:text-gray-100"
          dangerouslySetInnerHTML={{ __html: greeting.content.text }}
        />
      </div>
    );
  };

  // Handle sender info
  const renderSenderInfo = () => {
    if (!greeting ||!greeting.sender_id) return null;
    
    return (
      <div className="border-t border-gray-200 pt-6">
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-gray-900">
              From: {greeting.sender?.name || 'Unknown Sender'}
            </h3>
            <p className="text-sm text-gray-600">
              {greeting.sender?.email || 'unknown@example.com'}
            </p>
          </div>
        </div>
      </div>
    );
  };

  // Handle status badge
  const getStatusBadge = () => {
    const status = greeting?.status || 'pending';
    
    switch (status) {
      case 'sent':
        return (
          <span className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-full bg-green-100 text-green-800">
            Sent
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-full bg-yellow-100 text-yellow-800">
            Pending
          </span>
        );
      case 'delivered':
        return (
          <span className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-full bg-blue-100 text-blue-800">
            Delivered
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-full bg-red-100 text-red-800">
            Failed
          </span>
        );
      default:
        return null;
    }
  };

  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold text-gray-900">Error Loading Greeting</h2>
          <p className="mt-4 text-gray-600">
            {error?.message || 'Failed to load greeting details'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-10 sm:px-6 lg:px-8">
        <div className="bg-white shadow overflow-hidden rounded-lg">
          <div className="relative p-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">
                Greeting Details
              </h2>
              {isOwner && (
                <div className="space-x-2">
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="text-red-600 hover:text-red-500 font-medium"
                  >
                    {showDeleteConfirm? 'Confirm Delete' : 'Delete'}
                  </button>
                  {showDeleteConfirm && (
                    <span className="text-sm text-gray-500">Are you sure?</span>
                  )}
                </div>
              )}
            </div>
            
            {getStatusBadge()}
            
            {renderContent()}
            
            {renderMedia()}
          </div>
          
          <div className="p-6 border-t border-gray-200">
            <div className="space-y-4">
              {renderSenderInfo()}
              
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-medium text-gray-900">Reply</h3>
                <form onSubmit={handleReply} className="mt-4 space-y-4">
                  <textarea
                    rows={5}
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="Write your reply..."
                    className="w-full border border-gray-300 rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  />
                  
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={replyMutation.isMutating}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {replyMutation.isMutating? (
                        <span className="flex items-center">
                          <svg className="animate-spin -ml-1 mr-1 h-4 w-4 text-gray-700" 
                              xmlns="http://www.w3.org/2000/svg" 
                              fill="none" 
                              viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Sending...
                        </span>
                      ) : 'Send Reply'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UV_GreetingDetail;