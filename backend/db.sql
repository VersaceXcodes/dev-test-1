-- Create Tables
CREATE TABLE Users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    role TEXT NOT NULL DEFAULT 'user',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE Greetings (
    id TEXT PRIMARY KEY,
    content JSON NOT NULL,
    sender_id TEXT NOT NULL REFERENCES Users(id),
    recipient_type TEXT NOT NULL,
    recipient_id TEXT NOT NULL,
    status TEXT NOT NULL,
    scheduled_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE GreetingMedia (
    id TEXT PRIMARY KEY,
    greeting_id TEXT NOT NULL REFERENCES Greetings(id),
    url TEXT NOT NULL,
    media_type TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE Groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    privacy_setting TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE GroupMembers (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL REFERENCES Groups(id),
    user_id TEXT NOT NULL REFERENCES Users(id),
    role TEXT NOT NULL,
    joined_at TEXT NOT NULL
);

CREATE TABLE GroupChatMessages (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL REFERENCES Groups(id),
    sender_id TEXT NOT NULL REFERENCES Users(id),
    content TEXT NOT NULL,
    created_at TEXT NOT NULL
);

-- Seed Data
INSERT INTO Users (id, name, email, password_hash, role, is_active, created_at, updated_at)
VALUES
    ('user1', 'Alice Smith', 'alice@example.com', 'password123', 'user', true, '2023-10-05T10:00:00Z', '2023-10-05T10:00:00Z'),
    ('user2', 'Bob Johnson', 'bob@example.com', 'user123', 'user', true, '2023-10-05T10:01:00Z', '2023-10-05T10:01:00Z'),
    ('admin1', 'Admin User', 'admin@example.com', 'admin123', 'admin', true, '2023-10-05T10:02:00Z', '2023-10-05T10:02:00Z'),
    ('user3', 'Charlie Brown', 'charlie@example.com', 'pass456', 'user', false, '2023-10-05T10:03:00Z', '2023-10-05T10:03:00Z');

INSERT INTO Groups (id, name, description, privacy_setting, created_at, updated_at)
VALUES
    ('group1', 'Friends Circle', 'Close friends group', 'private', '2023-10-05T10:30:00Z', '2023-10-05T10:30:00Z'),
    ('group2', 'Work Team', 'Project collaboration', 'public', '2023-10-05T10:35:00Z', '2023-10-05T10:35:00Z'),
    ('group3', 'Book Lovers', NULL, 'public', '2023-10-05T10:40:00Z', '2023-10-05T10:40:00Z');

INSERT INTO GroupMembers (id, group_id, user_id, role, joined_at)
VALUES
    ('gm1', 'group1', 'user1', 'admin', '2023-10-05T10:31:00Z'),
    ('gm2', 'group1', 'user2', 'member', '2023-10-05T10:32:00Z'),
    ('gm3', 'group2', 'user1', 'member', '2023-10-05T10:36:00Z'),
    ('gm4', 'group2', 'admin1', 'admin', '2023-10-05T10:37:00Z'),
    ('gm5', 'group3', 'user3', 'member', '2023-10-05T10:41:00Z');

INSERT INTO Greetings (id, content, sender_id, recipient_type, recipient_id, status, scheduled_at, created_at, updated_at)
VALUES
    ('greet1', '{"text": "Happy Birthday!", "emoji": "🎉"}', 'user1', 'user', 'user2', 'sent', NULL, '2023-10-05T11:00:00Z', '2023-10-05T11:00:00Z'),
    ('greet2', '{"text": "Merry Christmas!", "gif": "snow"}', 'user1', 'group', 'group1', 'pending', '2023-12-25T09:00:00Z', '2023-10-05T11:05:00Z', '2023-10-05T11:05:00Z'),
    ('greet3', '{"text": "Welcome aboard!", "image": "sunset"}', 'admin1', 'user', 'user3', 'delivered', NULL, '2023-10-05T11:10:00Z', '2023-10-05T11:10:00Z'),
    ('greet4', '{"text": "Good morning!", "sticker": "coffee"}', 'user2', 'group', 'group2', 'failed', NULL, '2023-10-05T11:15:00Z', '2023-10-05T11:15:00Z');

INSERT INTO GreetingMedia (id, greeting_id, url, media_type, created_at)
VALUES
    ('media1', 'greet1', 'https://picsum.photos/seed/greet1/200/300', 'image', '2023-10-05T11:00:00Z'),
    ('media2', 'greet2', 'https://picsum.photos/seed/greet2/300/200', 'image', '2023-10-05T11:05:00Z'),
    ('media3', 'greet3', 'https://picsum.photos/seed/greet3/250/250', 'image', '2023-10-05T11:10:00Z');

INSERT INTO GroupChatMessages (id, group_id, sender_id, content, created_at)
VALUES
    ('msg1', 'group1', 'user1', 'Let''s meet this weekend!', '2023-10-05T11:20:00Z'),
    ('msg2', 'group1', 'user2', 'Sounds great!', '2023-10-05T11:21:00Z'),
    ('msg3', 'group2', 'admin1', 'Project deadline extended!', '2023-10-05T11:22:00Z'),
    ('msg4', 'group3', 'user3', 'What book are we reading next?', '2023-10-05T11:23:00Z'),
    ('msg5', 'group2', 'user1', 'Meeting at 3 PM tomorrow', '2023-10-05T11:24:00Z');