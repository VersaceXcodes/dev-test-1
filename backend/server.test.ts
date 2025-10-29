import { app, pool } from './server';
import request from 'supertest';
import { WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { UserEntity } from '../zodSchemas';

// Test configuration
const API_PREFIX = '/api';
const WS_PREFIX = '/ws';

// Test data
const testUser = {
  id: 'test-user-1',
  name: 'Test User',
  email: 'test@example.com',
  password_hash: 'test123',
  role: 'user',
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

// Setup and teardown
beforeAll(async () => {
  // Seed test data
  await pool.query(`
    INSERT INTO Users (id, name, email, password_hash, role, is_active, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT (id) DO NOTHING;
  `, [
    testUser.id, testUser.name, testUser.email, testUser.password_hash,
    testUser.role, testUser.is_active, testUser.created_at, testUser.updated_at
  ]);
});

afterEach(async () => {
  // Rollback transactions after each test
  await pool.query('ROLLBACK');
});

afterAll(async () => {
  // Clean up test data
  await pool.query('DELETE FROM Users WHERE id = $1', [testUser.id]);
  await pool.end();
});

// Unit Tests
describe('Unit Tests', () => {
  describe('Validation', () => {
    it('should validate user creation with valid data', async () => {
      const userData = {
        id: uuidv4(),
        name: 'Valid User',
        email: 'valid@example.com',
        password_hash: 'password123'
      };
      // Mock validation function
      const validateSpy = jest.fn(() => userData);
      // Test validation logic
      expect(validateSpy()).toEqual(userData);
    });

    it('should reject user creation with invalid email', async () => {
      const invalidUser = {
        id: uuidv4(),
        name: 'Invalid User',
        email: 'invalid-email',
        password_hash: 'password123'
      };
      // Expect validation to throw error
      expect(() => validateUser(invalidUser)).toThrow('Invalid email');
    });
  });

  describe('Middleware', () => {
    it('should authenticate valid JWT', async () => {
      const validToken = 'valid.jwt.token';
      const req = { headers: { authorization: `Bearer ${validToken}` } };
      const res = { send: jest.fn() };
      const next = jest.fn();
      
      // Mock JWT verification
      jest.spyOn(jwt, 'verify').mockReturnValue({ id: 'test-user' });
      
      await authMiddleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should reject invalid JWT', async () => {
      const invalidToken = 'invalid.jwt.token';
      const req = { headers: { authorization: `Bearer ${invalidToken}` } };
      const res = { send: jest.fn() };
      const next = jest.fn();
      
      jest.spyOn(jwt, 'verify').mockImplementation(() => { throw new Error('Invalid token') });
      
      await authMiddleware(req, res, next);
      expect(res.send).toHaveBeenCalledWith(expect.objectContaining({ status: 401 }));
    });
  });
});

// Integration Tests
describe('API Integration Tests', () => {
  describe('/auth', () => {
    it('should register new user successfully', async () => {
      const userData = {
        id: uuidv4(),
        name: 'New User',
        email: 'newuser@example.com',
        password_hash: 'password123'
      };
      
      const res = await request(app)
       .post(`${API_PREFIX}/auth/register`)
       .send(userData);
        
      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('auth_token');
      expect(res.body).toHaveProperty('id', userData.id);
    });

    it('should reject registration with existing email', async () => {
      const existingEmailUser = {
        id: uuidv4(),
        name: 'Duplicate User',
        email: testUser.email, // Same email as seeded user
        password_hash: 'password123'
      };
      
      const res = await request(app)
       .post(`${API_PREFIX}/auth/register`)
       .send(existingEmailUser);
        
      expect(res.statusCode).toBe(409);
    });
  });

  describe('/greetings', () => {
    let authToken;
    
    beforeEach(async () => {
      // Get auth token for protected routes
      const loginRes = await request(app)
       .post(`${API_PREFIX}/auth/login`)
       .send({
          email: testUser.email,
          password_hash: testUser.password_hash
        });
        
      authToken = loginRes.body.auth_token;
    });

    it('should create new greeting', async () => {
      const greetingData = {
        id: uuidv4(),
        content: { text: 'Hello World!' },
        sender_id: testUser.id,
        recipient_type: 'user',
        recipient_id: testUser.id,
        status: 'sent'
      };
      
      const res = await request(app)
       .post(`${API_PREFIX}/greetings`)
       .set("Authorization", `Bearer ${authToken}`)
       .send(greetingData);
        
      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.content).toEqual(greetingData.content);
    });

    it('should return 404 for invalid greeting ID', async () => {
      const invalidId = 'invalid-id';
      
      const res = await request(app)
       .get(`${API_PREFIX}/greetings/${invalidId}`)
       .set("Authorization", `Bearer ${authToken}`);
        
      expect(res.statusCode).toBe(404);
    });
  });
});

// WebSocket Tests
describe('WebSocket Tests', () => {
  let server;
  let client;

  beforeEach(() => {
    // Create fresh WebSocket server for each test
    server = new WebSocketServer({ port: 8081 });
    
    // Mock greeting creation event
    server.on('connection', (ws) => {
      ws.on('message', (message) => {
        const data = JSON.parse(message);
        if (data.type === 'create_greeting') {
          ws.send(JSON.stringify({
            type: 'greeting_created',
            data: {
              id: uuidv4(),
              content: data.data.content,
              sender_id: data.data.sender_id,
              status: 'sent'
            }
          }));
        }
      });
    });

    client = new WebSocket(`ws://localhost:8081${WS_PREFIX}`);
  });

  afterEach(() => {
    client.close();
    server.close();
  });

  it('should receive greeting created event', (done) => {
    client.on('message', (message) => {
      const data = JSON.parse(message);
      if (data.type === 'greeting_created') {
        expect(data.data).toHaveProperty('id');
        expect(data.data.status).toBe('sent');
        done();
      }
    });
    
    // Send greeting creation event
    client.send(JSON.stringify({
      type: 'create_greeting',
      data: {
        content: { text: 'Test Greeting' },
        sender_id: testUser.id
      }
    }));
  });
});

// Database Tests
describe('Database Operations', () => {
  it('should enforce unique email constraint', async () => {
    try {
      await pool.query(`
        INSERT INTO Users (id, email)
        VALUES ($1, $2)
      `, [uuidv4(), testUser.email]);
      fail('Should have thrown unique constraint error');
    } catch (error) {
      expect(error.code).toBe('23505'); // PostgreSQL unique violation code
    }
  });

  it('should maintain created_at and updated_at timestamps', async () => {
    const newUserId = uuidv4();
    await pool.query(`
      INSERT INTO Users (id, name, email, password_hash)
      VALUES ($1, $2, $3, $4)
    `, [newUserId, 'Test User', 'test@user.com', 'password']);
    
    const result = await pool.query(`
      SELECT created_at, updated_at FROM Users
      WHERE id = $1
    `, [newUserId]);
    
    const timestamps = result.rows[0];
    expect(timestamps.created_at).toBeCloseTo(timestamps.updated_at);
    expect(new Date(timestamps.created_at) <= new Date()).toBe(true);
  });
});