import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { Pool } from 'pg';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import { Server } from 'socket.io';
import { createServer } from 'http';
import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import {
  userEntitySchema,
  createUserInputSchema,
  updateUserInputSchema,
  searchUsersInputSchema,
  greetingEntitySchema,
  createGreetingInputSchema,
  updateGreetingInputSchema,
  searchGreetingsInputSchema,
  greetingMediaEntitySchema,
  createGreetingMediaInputSchema,
  updateGreetingMediaInputSchema,
  searchGreetingMediaInputSchema,
  groupEntitySchema,
  createGroupInputSchema,
  updateGroupInputSchema,
  searchGroupsInputSchema,
  groupMemberEntitySchema,
  createGroupMemberInputSchema,
  updateGroupMemberInputSchema,
  searchGroupMembersInputSchema,
  groupChatMessageEntitySchema,
  createGroupChatMessageInputSchema,
  updateGroupChatMessageInputSchema,
  searchGroupChatMessagesInputSchema
} from './schema.ts';

dotenv.config();

// ESM workaround for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Environment variables
const { 
  DATABASE_URL, 
  PGHOST, 
  PGDATABASE, 
  PGUSER, 
  PGPASSWORD, 
  PGPORT = 5432, 
  JWT_SECRET = 'your-secret-key',
  PORT = 3000
} = process.env;

// PostgreSQL connection
const pool = new Pool(
  DATABASE_URL
    ? { 
        connectionString: DATABASE_URL, 
        ssl: { require: true } 
      }
    : {
        host: PGHOST,
        database: PGDATABASE,
        user: PGUSER,
        password: PGPASSWORD,
        port: Number(PGPORT),
        ssl: { require: true },
      }
);

// Error response utility
interface ErrorResponse {
  success: false;
  message: string;
  error_code?: string;
  details?: any;
  timestamp: string;
}

function createErrorResponse(
  message: string,
  error?: any,
  errorCode?: string
): ErrorResponse {
  const response: ErrorResponse = {
    success: false,
    message,
    timestamp: new Date().toISOString()
  };

  if (errorCode) {
    response.error_code = errorCode;
  }

  if (error) {
    response.details = {
      name: error.name,
      message: error.message,
      stack: error.stack
    };
  }

  return response;
}

// Express app setup
const app = express();
const httpServer = createServer(app);

// Socket.io setup
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '5mb' }));
app.use(morgan('dev'));

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Create storage directory if it doesn't exist
const storageDir = path.join(__dirname, 'storage');
if (!fs.existsSync(storageDir)) {
  fs.mkdirSync(storageDir, { recursive: true });
}

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, storageDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

/*
 * JWT Authentication Middleware
 * Validates JWT token from Authorization header
 * Attaches user object to request for downstream handlers
 */
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json(createErrorResponse('Access token required', null, 'AUTH_TOKEN_REQUIRED'));
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const result = await pool.query(
      'SELECT id, email, name, role, is_active, created_at FROM Users WHERE id = $1',
      [decoded.user_id]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json(createErrorResponse('Invalid token', null, 'AUTH_TOKEN_INVALID'));
    }

    req.user = result.rows[0];
    next();
  } catch (error) {
    return res.status(403).json(createErrorResponse('Invalid or expired token', error, 'AUTH_TOKEN_INVALID'));
  }
};

/*
 * Admin Role Middleware
 * Checks if authenticated user has admin role
 */
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json(createErrorResponse('Admin access required', null, 'ADMIN_ACCESS_REQUIRED'));
  }
  next();
};

// ============= AUTH ENDPOINTS =============

/*
 * POST /api/auth/register
 * Creates new user account with email/password
 * Validates email uniqueness, generates JWT token
 * NO password hashing (development mode)
 */
app.post('/api/auth/register', async (req, res) => {
  try {
    const validation = createUserInputSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json(createErrorResponse('Validation error', validation.error, 'VALIDATION_ERROR'));
    }

    const { name, email, password_hash } = validation.data;

    // Check if user already exists
    const existingUser = await pool.query('SELECT id FROM Users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json(createErrorResponse('Email already exists', null, 'EMAIL_EXISTS'));
    }

    // Create user (NO HASHING - store password directly)
    const userId = validation.data.id || uuidv4();
    const now = new Date().toISOString();
    
    const result = await pool.query(
      'INSERT INTO Users (id, name, email, password_hash, role, is_active, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, email, name, role, is_active, created_at',
      [userId, name, email.toLowerCase().trim(), password_hash, validation.data.role || 'user', validation.data.is_active !== false, now, now]
    );

    const user = result.rows[0];

    // Generate JWT
    const auth_token = jwt.sign(
      { user_id: user.id, email: user.email }, 
      JWT_SECRET, 
      { expiresIn: '7d' }
    );

    res.status(201).json({
      id: user.id,
      auth_token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
  }
});

/*
 * POST /api/auth/login
 * Authenticates user with email/password
 * Returns JWT token on success
 * Direct password comparison (no hashing)
 */
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password_hash } = req.body;

    if (!email || !password_hash) {
      return res.status(400).json(createErrorResponse('Email and password are required', null, 'MISSING_CREDENTIALS'));
    }

    // Find user (direct password comparison)
    const result = await pool.query('SELECT * FROM Users WHERE email = $1', [email.toLowerCase().trim()]);
    if (result.rows.length === 0) {
      return res.status(401).json(createErrorResponse('Invalid credentials', null, 'INVALID_CREDENTIALS'));
    }

    const user = result.rows[0];

    // Check password (direct comparison)
    if (password_hash !== user.password_hash) {
      return res.status(401).json(createErrorResponse('Invalid credentials', null, 'INVALID_CREDENTIALS'));
    }

    // Generate JWT
    const auth_token = jwt.sign(
      { user_id: user.id, email: user.email }, 
      JWT_SECRET, 
      { expiresIn: '7d' }
    );

    res.json({
      id: user.id,
      auth_token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
  }
});

// ============= USER ENDPOINTS =============

/*
 * GET /api/users
 * Lists users with search, pagination, sorting
 * Supports query parameters: query, limit, offset, sort_by, sort_order
 */
app.get('/api/users', async (req, res) => {
  try {
    const { query, limit = 10, offset = 0, sort_by = 'created_at', sort_order = 'desc' } = req.query;
    
    let queryText = 'SELECT id, name, email, role, is_active, created_at, updated_at FROM Users';
    const queryParams = [];
    
    if (query) {
      queryText += ' WHERE name ILIKE $1 OR email ILIKE $1';
      queryParams.push(`%${query}%`);
    }
    
    queryText += ` ORDER BY ${sort_by} ${sort_order} LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
    queryParams.push(Number(limit), Number(offset));
    
    const result = await pool.query(queryText, queryParams);
    res.json(result.rows);
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
  }
});

/*
 * GET /api/users/:user_id
 * Retrieves single user by ID
 */
app.get('/api/users/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;
    
    const result = await pool.query(
      'SELECT id, name, email, role, is_active, created_at, updated_at FROM Users WHERE id = $1',
      [user_id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json(createErrorResponse('User not found', null, 'USER_NOT_FOUND'));
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
  }
});

/*
 * PUT /api/users/:user_id
 * Updates user details
 * Validates input with Zod schema
 */
app.put('/api/users/:user_id', authenticateToken, async (req, res) => {
  try {
    const { user_id } = req.params;
    const validation = updateUserInputSchema.safeParse({ ...req.body, id: user_id });
    
    if (!validation.success) {
      return res.status(400).json(createErrorResponse('Validation error', validation.error, 'VALIDATION_ERROR'));
    }

    const updates = [];
    const values = [];
    let paramCounter = 1;

    if (validation.data.name !== undefined) {
      updates.push(`name = $${paramCounter++}`);
      values.push(validation.data.name);
    }
    if (validation.data.email !== undefined) {
      updates.push(`email = $${paramCounter++}`);
      values.push(validation.data.email);
    }
    if (validation.data.password_hash !== undefined) {
      updates.push(`password_hash = $${paramCounter++}`);
      values.push(validation.data.password_hash);
    }
    if (validation.data.role !== undefined) {
      updates.push(`role = $${paramCounter++}`);
      values.push(validation.data.role);
    }
    if (validation.data.is_active !== undefined) {
      updates.push(`is_active = $${paramCounter++}`);
      values.push(validation.data.is_active);
    }

    updates.push(`updated_at = $${paramCounter++}`);
    values.push(new Date().toISOString());
    values.push(user_id);

    const result = await pool.query(
      `UPDATE Users SET ${updates.join(', ')} WHERE id = $${paramCounter} RETURNING id, name, email, role, is_active, created_at, updated_at`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json(createErrorResponse('User not found', null, 'USER_NOT_FOUND'));
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
  }
});

/*
 * DELETE /api/users/:user_id
 * Deletes user account
 */
app.delete('/api/users/:user_id', authenticateToken, async (req, res) => {
  try {
    const { user_id } = req.params;
    
    const result = await pool.query('DELETE FROM Users WHERE id = $1 RETURNING id', [user_id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json(createErrorResponse('User not found', null, 'USER_NOT_FOUND'));
    }
    
    res.status(204).send();
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
  }
});

// ============= GREETING ENDPOINTS =============

/*
 * GET /api/greetings
 * Lists greetings with filters (tab, recipient, date range, search)
 * Supports pagination and sorting
 */
app.get('/api/greetings', async (req, res) => {
  try {
    const { tab, recipient_id, date_min, date_max, search_query, limit = 10, offset = 0, sort_by = 'created_at', sort_order = 'desc' } = req.query;
    
    let queryText = 'SELECT id, content, sender_id, recipient_type, recipient_id, status, scheduled_at, created_at, updated_at FROM Greetings WHERE 1=1';
    const queryParams = [];
    let paramCounter = 1;
    
    if (tab === 'sent' && req.user) {
      queryText += ` AND sender_id = $${paramCounter++}`;
      queryParams.push(req.user.id);
    }
    
    if (tab === 'received' && req.user) {
      queryText += ` AND recipient_id = $${paramCounter++}`;
      queryParams.push(req.user.id);
    }
    
    if (tab === 'drafts') {
      queryText += ` AND status = $${paramCounter++}`;
      queryParams.push('pending');
    }
    
    if (recipient_id) {
      queryText += ` AND recipient_id = $${paramCounter++}`;
      queryParams.push(recipient_id);
    }
    
    if (date_min) {
      queryText += ` AND created_at >= $${paramCounter++}`;
      queryParams.push(date_min);
    }
    
    if (date_max) {
      queryText += ` AND created_at <= $${paramCounter++}`;
      queryParams.push(date_max);
    }
    
    if (search_query) {
      queryText += ` AND content::text ILIKE $${paramCounter++}`;
      queryParams.push(`%${search_query}%`);
    }
    
    queryText += ` ORDER BY ${sort_by} ${sort_order} LIMIT $${paramCounter++} OFFSET $${paramCounter++}`;
    queryParams.push(Number(limit), Number(offset));
    
    const result = await pool.query(queryText, queryParams);
    res.json(result.rows);
  } catch (error) {
    console.error('List greetings error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
  }
});

/*
 * POST /api/greetings
 * Creates new greeting with content and recipient info
 * Emits WebSocket event on creation
 */
app.post('/api/greetings', authenticateToken, async (req, res) => {
  try {
    const validation = createGreetingInputSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json(createErrorResponse('Validation error', validation.error, 'VALIDATION_ERROR'));
    }

    const greetingId = validation.data.id || uuidv4();
    const now = new Date().toISOString();
    
    const result = await pool.query(
      'INSERT INTO Greetings (id, content, sender_id, recipient_type, recipient_id, status, scheduled_at, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
      [
        greetingId,
        JSON.stringify(validation.data.content),
        validation.data.sender_id,
        validation.data.recipient_type,
        validation.data.recipient_id,
        validation.data.status,
        validation.data.scheduled_at || null,
        now,
        now
      ]
    );

    const greeting = result.rows[0];
    
    // Emit WebSocket event for greeting creation
    io.emit('greeting_created', greeting);
    
    // Create notification for recipient
    const notificationId = uuidv4();
    if (validation.data.recipient_type === 'user') {
      await pool.query(
        'INSERT INTO Notifications (id, user_id, greeting_id, message, read_at, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
        [notificationId, validation.data.recipient_id, greetingId, 'You received a new greeting!', null, now]
      );
      
      // Emit notification event
      io.to(validation.data.recipient_id).emit('notification', {
        id: notificationId,
        user_id: validation.data.recipient_id,
        greeting_id: greetingId,
        message: 'You received a new greeting!',
        read_at: null,
        created_at: now
      });
    }

    res.status(201).json(greeting);
  } catch (error) {
    console.error('Create greeting error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
  }
});

/*
 * GET /api/greetings/:greeting_id
 * Retrieves single greeting by ID
 */
app.get('/api/greetings/:greeting_id', async (req, res) => {
  try {
    const { greeting_id } = req.params;
    
    const result = await pool.query(
      'SELECT * FROM Greetings WHERE id = $1',
      [greeting_id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json(createErrorResponse('Greeting not found', null, 'GREETING_NOT_FOUND'));
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get greeting error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
  }
});

/*
 * PUT /api/greetings/:greeting_id
 * Updates greeting details
 * Emits WebSocket event on status update
 */
app.put('/api/greetings/:greeting_id', authenticateToken, async (req, res) => {
  try {
    const { greeting_id } = req.params;
    const validation = updateGreetingInputSchema.safeParse({ ...req.body, id: greeting_id });
    
    if (!validation.success) {
      return res.status(400).json(createErrorResponse('Validation error', validation.error, 'VALIDATION_ERROR'));
    }

    const updates = [];
    const values = [];
    let paramCounter = 1;

    if (validation.data.content !== undefined) {
      updates.push(`content = $${paramCounter++}`);
      values.push(JSON.stringify(validation.data.content));
    }
    if (validation.data.status !== undefined) {
      updates.push(`status = $${paramCounter++}`);
      values.push(validation.data.status);
    }
    if (validation.data.scheduled_at !== undefined) {
      updates.push(`scheduled_at = $${paramCounter++}`);
      values.push(validation.data.scheduled_at);
    }

    updates.push(`updated_at = $${paramCounter++}`);
    values.push(new Date().toISOString());
    values.push(greeting_id);

    const result = await pool.query(
      `UPDATE Greetings SET ${updates.join(', ')} WHERE id = $${paramCounter} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json(createErrorResponse('Greeting not found', null, 'GREETING_NOT_FOUND'));
    }

    const greeting = result.rows[0];
    
    // Emit WebSocket event for greeting status update
    io.emit(`greeting_${greeting_id}_updated`, greeting);

    res.json(greeting);
  } catch (error) {
    console.error('Update greeting error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
  }
});

/*
 * DELETE /api/greetings/:greeting_id
 * Deletes greeting
 */
app.delete('/api/greetings/:greeting_id', authenticateToken, async (req, res) => {
  try {
    const { greeting_id } = req.params;
    
    // Delete associated media first
    await pool.query('DELETE FROM GreetingMedia WHERE greeting_id = $1', [greeting_id]);
    
    const result = await pool.query('DELETE FROM Greetings WHERE id = $1 RETURNING id', [greeting_id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json(createErrorResponse('Greeting not found', null, 'GREETING_NOT_FOUND'));
    }
    
    res.status(204).send();
  } catch (error) {
    console.error('Delete greeting error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
  }
});

/*
 * POST /api/greetings/:greeting_id/media
 * Uploads media file for greeting and stores reference in DB
 * Handles file storage in ./storage directory
 */
app.post('/api/greetings/:greeting_id/media', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    const { greeting_id } = req.params;
    
    if (!req.file) {
      return res.status(400).json(createErrorResponse('No file uploaded', null, 'NO_FILE'));
    }

    const mediaId = uuidv4();
    const url = `/storage/${req.file.filename}`;
    const now = new Date().toISOString();
    
    const result = await pool.query(
      'INSERT INTO GreetingMedia (id, greeting_id, url, media_type, created_at) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [mediaId, greeting_id, url, req.file.mimetype, now]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Upload media error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
  }
});

// Serve uploaded files
app.use('/storage', express.static(storageDir));

// ============= GROUP ENDPOINTS =============

/*
 * GET /api/groups
 * Lists groups with search and pagination
 */
app.get('/api/groups', async (req, res) => {
  try {
    const { query, limit = 10, offset = 0, sort_by = 'created_at', sort_order = 'desc' } = req.query;
    
    let queryText = 'SELECT id, name, description, privacy_setting, created_at, updated_at FROM Groups';
    const queryParams = [];
    
    if (query) {
      queryText += ' WHERE name ILIKE $1 OR description ILIKE $1';
      queryParams.push(`%${query}%`);
    }
    
    queryText += ` ORDER BY ${sort_by} ${sort_order} LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
    queryParams.push(Number(limit), Number(offset));
    
    const result = await pool.query(queryText, queryParams);
    res.json(result.rows);
  } catch (error) {
    console.error('List groups error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
  }
});

/*
 * POST /api/groups
 * Creates new group
 */
app.post('/api/groups', authenticateToken, async (req, res) => {
  try {
    const validation = createGroupInputSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json(createErrorResponse('Validation error', validation.error, 'VALIDATION_ERROR'));
    }

    const groupId = validation.data.id || uuidv4();
    const now = new Date().toISOString();
    
    const result = await pool.query(
      'INSERT INTO Groups (id, name, description, privacy_setting, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [
        groupId,
        validation.data.name,
        validation.data.description || null,
        validation.data.privacy_setting || 'public',
        now,
        now
      ]
    );

    // Auto-add creator as admin
    const memberId = uuidv4();
    await pool.query(
      'INSERT INTO GroupMembers (id, group_id, user_id, role, joined_at) VALUES ($1, $2, $3, $4, $5)',
      [memberId, groupId, req.user.id, 'admin', now]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
  }
});

/*
 * GET /api/groups/:group_id
 * Retrieves single group by ID
 */
app.get('/api/groups/:group_id', async (req, res) => {
  try {
    const { group_id } = req.params;
    
    const result = await pool.query(
      'SELECT * FROM Groups WHERE id = $1',
      [group_id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json(createErrorResponse('Group not found', null, 'GROUP_NOT_FOUND'));
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get group error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
  }
});

/*
 * PUT /api/groups/:group_id
 * Updates group details
 */
app.put('/api/groups/:group_id', authenticateToken, async (req, res) => {
  try {
    const { group_id } = req.params;
    const validation = updateGroupInputSchema.safeParse({ ...req.body, id: group_id });
    
    if (!validation.success) {
      return res.status(400).json(createErrorResponse('Validation error', validation.error, 'VALIDATION_ERROR'));
    }

    const updates = [];
    const values = [];
    let paramCounter = 1;

    if (validation.data.name !== undefined) {
      updates.push(`name = $${paramCounter++}`);
      values.push(validation.data.name);
    }
    if (validation.data.description !== undefined) {
      updates.push(`description = $${paramCounter++}`);
      values.push(validation.data.description);
    }
    if (validation.data.privacy_setting !== undefined) {
      updates.push(`privacy_setting = $${paramCounter++}`);
      values.push(validation.data.privacy_setting);
    }

    updates.push(`updated_at = $${paramCounter++}`);
    values.push(new Date().toISOString());
    values.push(group_id);

    const result = await pool.query(
      `UPDATE Groups SET ${updates.join(', ')} WHERE id = $${paramCounter} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json(createErrorResponse('Group not found', null, 'GROUP_NOT_FOUND'));
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update group error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
  }
});

/*
 * DELETE /api/groups/:group_id
 * Deletes group and all associated members/messages
 */
app.delete('/api/groups/:group_id', authenticateToken, async (req, res) => {
  try {
    const { group_id } = req.params;
    
    // Delete associated data
    await pool.query('DELETE FROM GroupChatMessages WHERE group_id = $1', [group_id]);
    await pool.query('DELETE FROM GroupMembers WHERE group_id = $1', [group_id]);
    
    const result = await pool.query('DELETE FROM Groups WHERE id = $1 RETURNING id', [group_id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json(createErrorResponse('Group not found', null, 'GROUP_NOT_FOUND'));
    }
    
    res.status(204).send();
  } catch (error) {
    console.error('Delete group error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
  }
});

/*
 * POST /api/groups/:group_id/members
 * Adds member to group
 * Emits WebSocket event on member join
 */
app.post('/api/groups/:group_id/members', authenticateToken, async (req, res) => {
  try {
    const { group_id } = req.params;
    const validation = createGroupMemberInputSchema.safeParse({ ...req.body, group_id });
    
    if (!validation.success) {
      return res.status(400).json(createErrorResponse('Validation error', validation.error, 'VALIDATION_ERROR'));
    }

    // Verify group exists
    const groupCheck = await pool.query('SELECT id FROM Groups WHERE id = $1', [group_id]);
    if (groupCheck.rows.length === 0) {
      return res.status(404).json(createErrorResponse('Group not found', null, 'GROUP_NOT_FOUND'));
    }

    // Verify user exists
    const userCheck = await pool.query('SELECT id FROM Users WHERE id = $1', [validation.data.user_id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json(createErrorResponse('User not found', null, 'USER_NOT_FOUND'));
    }

    const memberId = validation.data.id || uuidv4();
    const now = new Date().toISOString();
    
    const result = await pool.query(
      'INSERT INTO GroupMembers (id, group_id, user_id, role, joined_at) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [memberId, group_id, validation.data.user_id, validation.data.role, now]
    );

    const member = result.rows[0];
    
    // Emit WebSocket event for member join
    io.to(group_id).emit('member_joined', member);

    res.status(201).json(member);
  } catch (error) {
    console.error('Add group member error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
  }
});

// ============= NOTIFICATION ENDPOINTS =============

/*
 * GET /api/notifications
 * Lists notifications for authenticated user
 */
app.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const { limit = 10, offset = 0, sort_by = 'created_at', sort_order = 'desc' } = req.query;
    
    const result = await pool.query(
      `SELECT id, user_id, greeting_id, message, read_at, created_at FROM Notifications WHERE user_id = $1 ORDER BY ${sort_by} ${sort_order} LIMIT $2 OFFSET $3`,
      [req.user.id, Number(limit), Number(offset)]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('List notifications error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
  }
});

/*
 * POST /api/notifications/:notification_id/mark-read
 * Marks notification as read
 */
app.post('/api/notifications/:notification_id/mark-read', authenticateToken, async (req, res) => {
  try {
    const { notification_id } = req.params;
    const { read_at } = req.body;
    
    const result = await pool.query(
      'UPDATE Notifications SET read_at = $1 WHERE id = $2 AND user_id = $3 RETURNING *',
      [read_at || new Date().toISOString(), notification_id, req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json(createErrorResponse('Notification not found', null, 'NOTIFICATION_NOT_FOUND'));
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
  }
});

// ============= ADMIN ENDPOINTS =============

/*
 * GET /api/admin/reports
 * Retrieves admin reports with user activity and reported greetings
 * Requires admin role
 */
app.get('/api/admin/reports', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { date_min, date_max, user_id } = req.query;
    
    let userActivityQuery = 'SELECT id, name, email, role, is_active, created_at, updated_at FROM Users WHERE 1=1';
    const userParams = [];
    let userParamCounter = 1;
    
    if (date_min) {
      userActivityQuery += ` AND created_at >= $${userParamCounter++}`;
      userParams.push(date_min);
    }
    if (date_max) {
      userActivityQuery += ` AND created_at <= $${userParamCounter++}`;
      userParams.push(date_max);
    }
    if (user_id) {
      userActivityQuery += ` AND id = $${userParamCounter++}`;
      userParams.push(user_id);
    }
    
    const userActivity = await pool.query(userActivityQuery, userParams);
    
    let greetingsQuery = 'SELECT * FROM Greetings WHERE status = $1';
    const greetingParams = ['failed'];
    let greetingParamCounter = 2;
    
    if (date_min) {
      greetingsQuery += ` AND created_at >= $${greetingParamCounter++}`;
      greetingParams.push(date_min);
    }
    if (date_max) {
      greetingsQuery += ` AND created_at <= $${greetingParamCounter++}`;
      greetingParams.push(date_max);
    }
    
    const reportedGreetings = await pool.query(greetingsQuery, greetingParams);
    
    res.json({
      user_activity: userActivity.rows,
      reported_greetings: reportedGreetings.rows
    });
  } catch (error) {
    console.error('Get admin reports error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
  }
});

/*
 * GET /api/admin/users
 * Lists all users for admin management
 * Requires admin role
 */
app.get('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { limit = 10, offset = 0, sort_by = 'created_at', sort_order = 'desc' } = req.query;
    
    const result = await pool.query(
      `SELECT id, name, email, role, is_active, created_at, updated_at FROM Users ORDER BY ${sort_by} ${sort_order} LIMIT $1 OFFSET $2`,
      [Number(limit), Number(offset)]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('List admin users error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============= WEBSOCKET HANDLERS =============

/*
 * WebSocket authentication middleware
 * Validates JWT token from handshake auth
 */
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication token required'));
    }
    
    const decoded = jwt.verify(token, JWT_SECRET);
    const result = await pool.query(
      'SELECT id, email, name, role FROM Users WHERE id = $1',
      [decoded.user_id]
    );
    
    if (result.rows.length === 0) {
      return next(new Error('Invalid token'));
    }
    
    socket.user = result.rows[0];
    next();
  } catch (error) {
    next(new Error('Authentication failed'));
  }
});

/*
 * WebSocket connection handler
 * Manages real-time events for notifications, greetings, group chat
 */
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.user.id}`);
  
  // Join user's personal room for notifications
  socket.join(socket.user.id);
  
  /*
   * Handle group chat message
   * Stores message in DB and broadcasts to group members
   */
  socket.on('send_group_message', async (data) => {
    try {
      const validation = createGroupChatMessageInputSchema.safeParse(data);
      
      if (!validation.success) {
        socket.emit('error', { message: 'Validation error', details: validation.error });
        return;
      }
      
      const messageId = validation.data.id || uuidv4();
      const now = new Date().toISOString();
      
      const result = await pool.query(
        'INSERT INTO GroupChatMessages (id, group_id, sender_id, content, created_at) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [messageId, validation.data.group_id, validation.data.sender_id, validation.data.content, now]
      );
      
      const message = result.rows[0];
      
      // Broadcast to all members in the group
      io.to(validation.data.group_id).emit('group_message', message);
    } catch (error) {
      console.error('Send group message error:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });
  
  /*
   * Handle join group room
   * Allows user to receive group-specific events
   */
  socket.on('join_group', (group_id) => {
    socket.join(group_id);
    console.log(`User ${socket.user.id} joined group ${group_id}`);
  });
  
  /*
   * Handle leave group room
   */
  socket.on('leave_group', (group_id) => {
    socket.leave(group_id);
    console.log(`User ${socket.user.id} left group ${group_id}`);
  });
  
  /*
   * Handle greeting status update
   * Emits real-time status changes to relevant parties
   */
  socket.on('update_greeting_status', async (data) => {
    try {
      const { greeting_id, status } = data;
      
      const result = await pool.query(
        'UPDATE Greetings SET status = $1, updated_at = $2 WHERE id = $3 RETURNING *',
        [status, new Date().toISOString(), greeting_id]
      );
      
      if (result.rows.length > 0) {
        const greeting = result.rows[0];
        io.emit(`greeting_${greeting_id}_status`, greeting);
      }
    } catch (error) {
      console.error('Update greeting status error:', error);
      socket.emit('error', { message: 'Failed to update greeting status' });
    }
  });
  
  /*
   * Handle admin moderation action
   * Broadcasts moderation events to admin dashboard
   */
  socket.on('admin_moderate', async (data) => {
    try {
      if (socket.user.role !== 'admin') {
        socket.emit('error', { message: 'Admin access required' });
        return;
      }
      
      const { greeting_id, action } = data;
      
      if (action === 'deleted') {
        await pool.query('DELETE FROM Greetings WHERE id = $1', [greeting_id]);
      } else if (action === 'approved') {
        await pool.query('UPDATE Greetings SET status = $1 WHERE id = $2', ['sent', greeting_id]);
      }
      
      // Broadcast to all admin clients
      io.emit('admin_moderation_action', { greeting_id, action });
    } catch (error) {
      console.error('Admin moderation error:', error);
      socket.emit('error', { message: 'Moderation action failed' });
    }
  });
  
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.user.id}`);
  });
});

// SPA catch-all: serve index.html for non-API routes only
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

export { app, pool };

// Start the server
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT} and listening on 0.0.0.0`);
});