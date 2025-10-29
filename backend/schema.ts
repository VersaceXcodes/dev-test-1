import { z } from 'zod';

// Users Schema
export const userEntitySchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(255),
  email: z.string().email(),
  password_hash: z.string().nullable(),
  role: z.string(),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export const createUserInputSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(255),
  email: z.string().email(),
  password_hash: z.string().nullable().optional(),
  role: z.string().optional().default('user'),
  is_active: z.boolean().optional().default(true)
});

export const updateUserInputSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(255).optional(),
  email: z.string().email().optional(),
  password_hash: z.string().nullable().optional(),
  role: z.string().optional(),
  is_active: z.boolean().optional()
});

export const searchUsersInputSchema = z.object({
  query: z.string().optional(),
  limit: z.number().int().positive().default(10),
  offset: z.number().int().nonnegative().default(0),
  sort_by: z.enum(['id', 'name', 'email', 'created_at', 'role', 'is_active']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc')
});

// Greetings Schema
export const greetingEntitySchema = z.object({
  id: z.string(),
  content: z.any(),
  sender_id: z.string(),
  recipient_type: z.string(),
  recipient_id: z.string(),
  status: z.enum(['sent', 'pending', 'delivered', 'failed']),
  scheduled_at: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export const createGreetingInputSchema = z.object({
  id: z.string(),
  content: z.any(),
  sender_id: z.string(),
  recipient_type: z.string(),
  recipient_id: z.string(),
  status: z.enum(['sent', 'pending', 'delivered', 'failed']),
  scheduled_at: z.string().nullable().optional()
});

export const updateGreetingInputSchema = z.object({
  id: z.string(),
  content: z.any().optional(),
  sender_id: z.string().optional(),
  recipient_type: z.string().optional(),
  recipient_id: z.string().optional(),
  status: z.enum(['sent', 'pending', 'delivered', 'failed']).optional(),
  scheduled_at: z.string().nullable().optional()
});

export const searchGreetingsInputSchema = z.object({
  query: z.string().optional(),
  limit: z.number().int().positive().default(10),
  offset: z.number().int().nonnegative().default(0),
  sort_by: z.enum(['id', 'status', 'scheduled_at', 'created_at']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc')
});

// GreetingMedia Schema
export const greetingMediaEntitySchema = z.object({
  id: z.string(),
  greeting_id: z.string(),
  url: z.string().url(),
  media_type: z.string(),
  created_at: z.coerce.date()
});

export const createGreetingMediaInputSchema = z.object({
  id: z.string(),
  greeting_id: z.string(),
  url: z.string().url(),
  media_type: z.string()
});

export const updateGreetingMediaInputSchema = z.object({
  id: z.string(),
  greeting_id: z.string().optional(),
  url: z.string().url().optional(),
  media_type: z.string().optional()
});

export const searchGreetingMediaInputSchema = z.object({
  query: z.string().optional(),
  limit: z.number().int().positive().default(10),
  offset: z.number().int().nonnegative().default(0),
  sort_by: z.enum(['id', 'greeting_id', 'media_type', 'created_at']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc')
});

// Groups Schema
export const groupEntitySchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(255),
  description: z.string().nullable(),
  privacy_setting: z.enum(['private', 'public']),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export const createGroupInputSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(255),
  description: z.string().nullable().optional(),
  privacy_setting: z.enum(['private', 'public']).default('public')
});

export const updateGroupInputSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(255).optional(),
  description: z.string().nullable().optional(),
  privacy_setting: z.enum(['private', 'public']).optional()
});

export const searchGroupsInputSchema = z.object({
  query: z.string().optional(),
  limit: z.number().int().positive().default(10),
  offset: z.number().int().nonnegative().default(0),
  sort_by: z.enum(['id', 'name', 'privacy_setting', 'created_at']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc')
});

// GroupMembers Schema
export const groupMemberEntitySchema = z.object({
  id: z.string(),
  group_id: z.string(),
  user_id: z.string(),
  role: z.enum(['admin', 'member']),
  joined_at: z.coerce.date()
});

export const createGroupMemberInputSchema = z.object({
  id: z.string(),
  group_id: z.string(),
  user_id: z.string(),
  role: z.enum(['admin', 'member'])
});

export const updateGroupMemberInputSchema = z.object({
  id: z.string(),
  group_id: z.string().optional(),
  user_id: z.string().optional(),
  role: z.enum(['admin', 'member']).optional()
});

export const searchGroupMembersInputSchema = z.object({
  query: z.string().optional(),
  limit: z.number().int().positive().default(10),
  offset: z.number().int().nonnegative().default(0),
  sort_by: z.enum(['id', 'group_id', 'user_id', 'role', 'joined_at']).default('joined_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc')
});

// GroupChatMessages Schema
export const groupChatMessageEntitySchema = z.object({
  id: z.string(),
  group_id: z.string(),
  sender_id: z.string(),
  content: z.string().min(1),
  created_at: z.coerce.date()
});

export const createGroupChatMessageInputSchema = z.object({
  id: z.string(),
  group_id: z.string(),
  sender_id: z.string(),
  content: z.string().min(1)
});

export const updateGroupChatMessageInputSchema = z.object({
  id: z.string(),
  group_id: z.string().optional(),
  sender_id: z.string().optional(),
  content: z.string().min(1).optional()
});

export const searchGroupChatMessagesInputSchema = z.object({
  query: z.string().optional(),
  limit: z.number().int().positive().default(10),
  offset: z.number().int().nonnegative().default(0),
  sort_by: z.enum(['id', 'group_id', 'sender_id', 'created_at']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc')
});

// Inferred Types
export type UserEntity = z.infer<typeof userEntitySchema>;
export type CreateUserInput = z.infer<typeof createUserInputSchema>;
export type UpdateUserInput = z.infer<typeof updateUserInputSchema>;
export type SearchUsersInput = z.infer<typeof searchUsersInputSchema>;

export type GreetingEntity = z.infer<typeof greetingEntitySchema>;
export type CreateGreetingInput = z.infer<typeof createGreetingInputSchema>;
export type UpdateGreetingInput = z.infer<typeof updateGreetingInputSchema>;
export type SearchGreetingsInput = z.infer<typeof searchGreetingsInputSchema>;

export type GreetingMediaEntity = z.infer<typeof greetingMediaEntitySchema>;
export type CreateGreetingMediaInput = z.infer<typeof createGreetingMediaInputSchema>;
export type UpdateGreetingMediaInput = z.infer<typeof updateGreetingMediaInputSchema>;
export type SearchGreetingMediaInput = z.infer<typeof searchGreetingMediaInputSchema>;

export type GroupEntity = z.infer<typeof groupEntitySchema>;
export type CreateGroupInput = z.infer<typeof createGroupInputSchema>;
export type UpdateGroupInput = z.infer<typeof updateGroupInputSchema>;
export type SearchGroupsInput = z.infer<typeof searchGroupsInputSchema>;

export type GroupMemberEntity = z.infer<typeof groupMemberEntitySchema>;
export type CreateGroupMemberInput = z.infer<typeof createGroupMemberInputSchema>;
export type UpdateGroupMemberInput = z.infer<typeof updateGroupMemberInputSchema>;
export type SearchGroupMembersInput = z.infer<typeof searchGroupMembersInputSchema>;

export type GroupChatMessageEntity = z.infer<typeof groupChatMessageEntitySchema>;
export type CreateGroupChatMessageInput = z.infer<typeof createGroupChatMessageInputSchema>;
export type UpdateGroupChatMessageInput = z.infer<typeof updateGroupChatMessageInputSchema>;
export type SearchGroupChatMessagesInput = z.infer<typeof searchGroupChatMessagesInputSchema>;