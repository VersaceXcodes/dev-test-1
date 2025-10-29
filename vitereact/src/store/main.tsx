import { create, persist } from 'zustand';
import { io } from 'socket.io-client';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

// ================== TYPES ==================
interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
  updated_at: string;
  is_active?: boolean;
}

interface Greeting {
  id: string;
  content: any;
  sender_id: string;
  recipient_type: 'user' | 'group';
  recipient_id: string;
  status: 'sent' | 'pending' | 'delivered' | 'failed';
  scheduled_at?: string;
  created_at: string;
  updated_at: string;
}

interface GreetingMedia {
  id: string;
  greeting_id: string;
  url: string;
  media_type: string;
  created_at: string;
}

interface Group {
  id: string;
  name: string;
  description?: string;
  privacy_setting: 'public' | 'private';
  created_at: string;
  updated_at: string;
}

interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: 'admin' | 'member';
  joined_at: string;
}

interface GroupChatMessage {
  id: string;
  group_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

interface Notification {
  id: string;
  user_id: string;
  greeting_id?: string;
  message: string;
  read_at?: string;
  created_at: string;
}

interface AdminReport {
  user_activity: User[];
  reported_greetings: Greeting[];
}

// ================== STORE ==================
type AppStore = {
  // === AUTH STATE ===
  auth_state: {
    current_user: User | null;
    auth_token: string | null;
    auth_status: {
      is_authenticated: boolean;
      is_loading: boolean;
    };
    error_message: string | null;
  };

  // === GREETINGS STATE ===
  greetings_state: {
    current_tab: 'sent' | 'received' | 'drafts';
    greetings: Greeting[];
    search_query: string;
    is_fetching: boolean;
    total_greetings: number;
  };

  // === GROUPS STATE ===
  groups_state: {
    current_group: Group | null;
    members: GroupMember[];
    messages: GroupChatMessage[];
    new_message: string;
    is_loading: boolean;
  };

  // === NOTIFICATIONS STATE ===
  notifications_state: {
    notifications: Notification[];
    unread_count: number;
    is_fetching: boolean;
  };

  // === ADMIN STATE ===
  admin_state: {
    user_metrics: AdminReport;
    selected_user: User | null;
    is_loading: boolean;
  };

  // === SOCKET INSTANCE ===
  socket: ReturnType<typeof io> | null;

  // === ACTIONS ===
  // Auth Actions
  login_user: (email: string, password: string) => Promise<void>;
  logout_user: () => void;
  register_user: (email: string, password: string, name: string) => Promise<void>;
  initialize_auth: () => Promise<void>;
  clear_auth_error: () => void;
  update_user_profile: (userData: Partial<User>) => void;

  // Greetings Actions
  set_greetings_tab: (tab: 'sent' | 'received' | 'drafts') => void;
  fetch_greetings: (params: {
    tab?: 'sent' | 'received' | 'drafts';
    recipient_id?: string;
    date_min?: string;
    date_max?: string;
    search_query?: string;
  }) => Promise<void>;
  add_greeting: (greeting: Greeting) => void;
  update_greeting: (id: string, updates: Partial<Greeting>) => void;
  delete_greeting: (id: string) => void;
  set_greeting_search: (query: string) => void;

  // Groups Actions
  fetch_group: (groupId: string) => Promise<void>;
  join_group: (groupId: string) => void;
  leave_group: (groupId: string) => void;
  add_group_member: (member: GroupMember) => void;
  send_group_message: (message: GroupChatMessage) => void;
  update_group_messages: (messages: GroupChatMessage[]) => void;
  set_new_message: (text: string) => void;

  // Notifications Actions
  fetch_notifications: () => Promise<void>;
  mark_notification_read: (notificationId: string) => void;

  // Admin Actions
  fetch_admin_reports: (params: {
    date_min?: string;
    date_max?: string;
    user_id?: string;
  }) => Promise<void>;
  select_admin_user: (user: User | null) => void;
  delete_user: (userId: string) => Promise<void>;
};

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const store = create(
  persist(
    (set, get) => ({
      // Initial State
      auth_state: {
        current_user: null,
        auth_token: null,
        auth_status: {
          is_authenticated: false,
          is_loading: true,
        },
        error_message: null,
      },

      greetings_state: {
        current_tab: 'sent',
        greetings: [],
        search_query: '',
        is_fetching: false,
        total_greetings: 0,
      },

      groups_state: {
        current_group: null,
        members: [],
        messages: [],
        new_message: '',
        is_loading: false,
      },

      notifications_state: {
        notifications: [],
        unread_count: 0,
        is_fetching: false,
      },

      admin_state: {
        user_metrics: {
          user_activity: [],
          reported_greetings: [],
        },
        selected_user: null,
        is_loading: false,
      },

      socket: null,

      // Actions
      login_user: async (email: string, password: string) => {
        set((state) => ({
          auth_state: {
           ...state.auth_state,
            auth_status: {
             ...state.auth_state.auth_status,
              is_loading: true,
            },
            error_message: null,
          },
        }));

        try {
          const response = await axios.post(
            `${apiBaseUrl}/api/auth/login`,
            { email, password },
            { headers: { 'Content-Type': 'application/json' } }
          );

          const { user, token } = response.data;

          set((state) => ({
            auth_state: {
              current_user: user,
              auth_token: token,
              auth_status: {
                is_authenticated: true,
                is_loading: false,
              },
              error_message: null,
            },
          }));

          // Initialize socket connection
          const socket = io(`${apiBaseUrl}/ws`, {
            auth: {
              token: token,
            },
          });

          set((state) => ({ socket }));

          // Setup realtime listeners
          setupRealtimeListeners(socket, set);
        } catch (error: any) {
          const errorMessage = error.response?.data?.message || error.message || 'Login failed';
          
          set((state) => ({
            auth_state: {
              current_user: null,
              auth_token: null,
              auth_status: {
                is_authenticated: false,
                is_loading: false,
              },
              error_message: errorMessage,
            },
          }));
        }
      },

      logout_user: () => {
        set((state) => ({
          auth_state: {
            current_user: null,
            auth_token: null,
            auth_status: {
              is_authenticated: false,
              is_loading: false,
            },
            error_message: null,
          },
          socket: null,
        }));
      },

      register_user: async (email: string, password: string, name: string) => {
        set((state) => ({
          auth_state: {
           ...state.auth_state,
            auth_status: {
             ...state.auth_state.auth_status,
              is_loading: true,
            },
            error_message: null,
          },
        }));

        try {
          const response = await axios.post(
            `${apiBaseUrl}/api/auth/register`,
            { email, password, name },
            { headers: { 'Content-Type': 'application/json' } }
          );

          const { user, token } = response.data;

          set((state) => ({
            auth_state: {
              current_user: user,
              auth_token: token,
              auth_status: {
                is_authenticated: true,
                is_loading: false,
              },
              error_message: null,
            },
          }));

          const socket = io(`${apiBaseUrl}/ws`, {
            auth: {
              token: token,
            },
          });

          set((state) => ({ socket }));

          setupRealtimeListeners(socket, set);
        } catch (error: any) {
          const errorMessage = error.response?.data?.message || error.message || 'Registration failed';
          
          set((state) => ({
            auth_state: {
              current_user: null,
              auth_token: null,
              auth_status: {
                is_authenticated: false,
                is_loading: false,
              },
              error_message: errorMessage,
            },
          }));
        }
      },

      initialize_auth: async () => {
        const { auth_token } = get().auth_state;

        if (!auth_token) {
          set((state) => ({
            auth_state: {
             ...state.auth_state,
              auth_status: {
               ...state.auth_state.auth_status,
                is_loading: false,
              },
            },
          }));
          return;
        }

        try {
          const response = await axios.get(
            `${apiBaseUrl}/api/auth/verify`,
            { headers: { Authorization: `Bearer ${auth_token}` } }
          );

          const { user } = response.data;
          
          set((state) => ({
            auth_state: {
              current_user: user,
              auth_token: auth_token,
              auth_status: {
                is_authenticated: true,
                is_loading: false,
              },
              error_message: null,
            },
          }));

          const socket = io(`${apiBaseUrl}/ws`, {
            auth: {
              token: auth_token,
            },
          });

          set((state) => ({ socket }));

          setupRealtimeListeners(socket, set);
        } catch (error) {
          set((state) => ({
            auth_state: {
              current_user: null,
              auth_token: null,
              auth_status: {
                is_authenticated: false,
                is_loading: false,
              },
              error_message: null,
            },
            socket: null,
          }));
        }
      },

      clear_auth_error: () => {
        set((state) => ({
          auth_state: {
           ...state.auth_state,
            error_message: null,
          },
        }));
      },

      update_user_profile: (userData: Partial<User>) => {
        set((state) => ({
          auth_state: {
           ...state.auth_state,
            current_user: state.auth_state.current_user
             ? {...state.auth_state.current_user,...userData }
              : null,
          },
        }));
      },

      // Greetings Actions
      set_greetings_tab: (tab: 'sent' | 'received' | 'drafts') => {
        set((state) => ({ greetings_state: {...state.greetings_state, current_tab: tab } }));
      },

      fetch_greetings: async (params: {
        tab?: 'sent' | 'received' | 'drafts';
        recipient_id?: string;
        date_min?: string;
        date_max?: string;
        search_query?: string;
      }) => {
        set((state) => ({
          greetings_state: {
           ...state.greetings_state,
            is_fetching: true,
          },
        }));

        try {
          const response = await axios.get(`${apiBaseUrl}/api/greetings`, {
            params: {
              tab: params.tab,
              recipient_id: params.recipient_id,
              date_min: params.date_min,
              date_max: params.date_max,
              search_query: params.search_query,
              limit: 10,
              offset: 0,
              sort_by: 'created_at',
              sort_order: 'desc',
            },
          });

          set((state) => ({
            greetings_state: {
             ...state.greetings_state,
              greetings: response.data,
              is_fetching: false,
              total_greetings: response.data.length,
            },
          }));
        } catch (error) {
          set((state) => ({
            greetings_state: {
             ...state.greetings_state,
              is_fetching: false,
            },
          }));
        }
      },

      add_greeting: (greeting: Greeting) => {
        set((state) => ({
          greetings_state: {
           ...state.greetings_state,
            greetings: [greeting,...state.greetings_state.greetings],
          },
        }));
      },

      update_greeting: (id: string, updates: Partial<Greeting>) => {
        set((state) => {
          const existingIndex = state.greetings_state.greetings.findIndex(g => g.id === id);
          if (existingIndex > -1) {
            const newGreetings = [...state.greetings_state.greetings];
            newGreetings[existingIndex] = {...newGreetings[existingIndex],...updates };
            return {
              greetings_state: {
               ...state.greetings_state,
                greetings: newGreetings,
              },
            };
          }
          return {};
        });
      },

      delete_greeting: (id: string) => {
        set((state) => ({
          greetings_state: {
           ...state.greetings_state,
            greetings: state.greetings_state.greetings.filter(g => g.id!== id),
          },
        }));
      },

      set_greeting_search: (query: string) => {
        set((state) => ({
          greetings_state: {
           ...state.greetings_state,
            search_query: query,
          },
        }));
      },

      // Groups Actions
      fetch_group: async (groupId: string) => {
        set((state) => ({
          groups_state: {
           ...state.groups_state,
            is_loading: true,
          },
        }));

        try {
          const response = await axios.get(`${apiBaseUrl}/api/groups/${groupId}`);
          
          set((state) => ({
            groups_state: {
             ...state.groups_state,
              current_group: response.data,
              is_loading: false,
            },
          }));
        } catch (error) {
          set((state) => ({
            groups_state: {
             ...state.groups_state,
              is_loading: false,
            },
          }));
        }
      },

      join_group: (groupId: string) => {
        // Typically handled via API call in component
        set((state) => ({
          groups_state: {
           ...state.groups_state,
            members: [...state.groups_state.members, {
              id: uuidv4(),
              group_id: groupId,
              user_id: state.auth_state.current_user?.id || '',
              role: 'member',
              joined_at: new Date().toISOString(),
            }],
          },
        }));
      },

      leave_group: (groupId: string) => {
        set((state) => ({
          groups_state: {
           ...state.groups_state,
            members: state.groups_state.members.filter(m => m.group_id!== groupId),
          },
        }));
      },

      add_group_member: (member: GroupMember) => {
        set((state) => ({
          groups_state: {
           ...state.groups_state,
            members: [...state.groups_state.members, member],
          },
        }));
      },

      send_group_message: (message: GroupChatMessage) => {
        set((state) => ({
          groups_state: {
           ...state.groups_state,
            messages: [...state.groups_state.messages, message],
          },
        }));
      },

      update_group_messages: (messages: GroupChatMessage[]) => {
        set((state) => ({
          groups_state: {
           ...state.groups_state,
            messages: messages,
          },
        }));
      },

      set_new_message: (text: string) => {
        set((state) => ({
          groups_state: {
           ...state.groups_state,
            new_message: text,
          },
        }));
      },

      // Notifications Actions
      fetch_notifications: async () => {
        set((state) => ({
          notifications_state: {
           ...state.notifications_state,
            is_fetching: true,
          },
        }));

        try {
          const response = await axios.get(`${apiBaseUrl}/api/notifications`, {
            headers: {
              Authorization: `Bearer ${get().auth_state.auth_token}`,
            },
          });
          
          set((state) => ({
            notifications_state: {
             ...state.notifications_state,
              notifications: response.data,
              unread_count: response.data.filter(n =>!n.read_at).length,
              is_fetching: false,
            },
          }));
        } catch (error) {
          set((state) => ({
            notifications_state: {
             ...state.notifications_state,
              is_fetching: false,
            },
          }));
        }
      },

      mark_notification_read: (notificationId: string) => {
        set((state) => {
          const index = state.notifications_state.notifications.findIndex(n => n.id === notificationId);
          if (index > -1) {
            const newNotifications = [...state.notifications_state.notifications];
            newNotifications[index] = {
             ...newNotifications[index],
              read_at: new Date().toISOString(),
            };
            return {
              notifications_state: {
               ...state.notifications_state,
                notifications: newNotifications,
                unread_count: state.notifications_state.unread_count - 1,
              },
            };
          }
          return {};
        });
      },

      // Admin Actions
      fetch_admin_reports: async (params: {
        date_min?: string;
        date_max?: string;
        user_id?: string;
      }) => {
        set((state) => ({
          admin_state: {
           ...state.admin_state,
            is_loading: true,
          },
        }));

        try {
          const response = await axios.get(`${apiBaseUrl}/api/admin/reports`, {
            params: {
              date_min: params.date_min,
              date_max: params.date_max,
              user_id: params.user_id,
            },
            headers: {
              Authorization: `Bearer ${get().auth_state.auth_token}`,
            },
          });
          
          set((state) => ({
            admin_state: {
             ...state.admin_state,
              user_metrics: response.data,
              is_loading: false,
            },
          }));
        } catch (error) {
          set((state) => ({
            admin_state: {
             ...state.admin_state,
              is_loading: false,
            },
          }));
        }
      },

      select_admin_user: (user: User | null) => {
        set((state) => ({
          admin_state: {
           ...state.admin_state,
            selected_user: user,
          },
        }));
      },

      delete_user: async (userId: string) => {
        try {
          await axios.delete(`${apiBaseUrl}/api/users/${userId}`, {
            headers: {
              Authorization: `Bearer ${get().auth_state.auth_token}`,
            },
          });

          set((state) => ({
            admin_state: {
             ...state.admin_state,
              user_metrics: {
               ...state.admin_state.user_metrics,
                user_activity: state.admin_state.user_metrics.user_activity.filter(u => u.id!== userId),
              },
            },
          }));
        } catch (error) {
          console.error('User deletion failed:', error);
        }
      },
    }),
    {
      name: 'helloconnect-store',
      partialize: (state) => ({
        auth_state: {
          current_user: state.auth_state.current_user,
          auth_token: state.auth_state.auth_token,
          auth_status: {
            is_authenticated: state.auth_state.auth_status.is_authenticated,
            is_loading: false,
          },
          error_message: null,
        },
      }),
    }
  )
);

// Setup realtime listeners
function setupRealtimeListeners(socket: ReturnType<typeof io>, set: (state: any) => void) {
  socket.on('greeting_created', (greeting: Greeting) => {
    set((state) => ({
      greetings_state: {
       ...state.greetings_state,
        greetings: [greeting,...state.greetings_state.greetings],
      },
    }));
  });

  socket.on('greeting_status_updated', (greeting: Greeting) => {
    set((state) => {
      const index = state.greetings_state.greetings.findIndex(g => g.id === greeting.id);
      if (index > -1) {
        const newGreetings = [...state.greetings_state.greetings];
        newGreetings[index] = greeting;
        return {
          greetings_state: {
           ...state.greetings_state,
            greetings: newGreetings,
          },
        };
      }
      return {};
    });
  });

  socket.on('group_message', (message: GroupChatMessage) => {
    set((state) => ({
      groups_state: {
       ...state.groups_state,
        messages: [...state.groups_state.messages, message],
      },
    }));
  });

  socket.on('member_joined', (member: GroupMember) => {
    set((state) => ({
      groups_state: {
       ...state.groups_state,
        members: [...state.groups_state.members, member],
      },
    }));
  });

  socket.on('admin_moderation_action', (action: { greeting_id: string, action: 'deleted' | 'approved' }) => {
    set((state) => {
      if (action.action === 'deleted') {
        return {
          admin_state: {
           ...state.admin_state,
            user_metrics: {
             ...state.admin_state.user_metrics,
              reported_greetings: state.admin_state.user_metrics.reported_greetings.filter(g => g.id!== action.greeting_id),
            },
          },
        };
      }
      return {};
    });
  });
}

export type { User, Greeting, Group, GroupMember, GroupChatMessage, Notification, AdminReport } from './types';
export { store as useAppStore };