# QuickNotes Data Model

## Entities

### users
| Column | Type | Key | Notes |
|---|---|---|---|
| id | INTEGER | Primary key | |
| name | TEXT | | required |
| email | TEXT | | required, unique |
| password_hash | TEXT | | required |
| created_at | TEXT | | defaults to the current time |

### notes
| Column | Type | Key | Notes |
|---|---|---|---|
| id | INTEGER | Primary key | |
| user_id | INTEGER | Foreign key to users(id) | required |
| title | TEXT | | required, 1 to 100 characters |
| body | TEXT | | optional |
| category | TEXT | | personal, work or study |
| created_at | TEXT | | defaults to the current time |

### tags
| Column | Type | Key | Notes |
|---|---|---|---|
| id | INTEGER | Primary key | |
| name | TEXT | | required, unique |

### note_tags (join table)
| Column | Type | Key | Notes |
|---|---|---|---|
| note_id | INTEGER | Foreign key to notes(id), part of primary key | |
| tag_id | INTEGER | Foreign key to tags(id), part of primary key | |

The primary key of `note_tags` is the pair `(note_id, tag_id)`.

## Relationships

- **One-to-many (users to notes):** one user owns many notes, but each note belongs to exactly one user. This is stored with the foreign key `notes.user_id`.
- **Many-to-many (notes and tags):** a note can have many tags, and a tag can be used on many notes. A single column cannot hold this, so the join table `note_tags` stores one row per note-tag pair. The composite primary key stops the same tag being attached to the same note twice.

## CREATE TABLE statements

```sql
PRAGMA foreign_keys = ON;

CREATE TABLE users (
  id             INTEGER PRIMARY KEY,
  name           TEXT NOT NULL,
  email          TEXT NOT NULL UNIQUE,
  password_hash  TEXT NOT NULL,
  created_at     TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notes (
  id          INTEGER PRIMARY KEY,
  user_id     INTEGER NOT NULL,
  title       TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 100),
  body        TEXT,
  category    TEXT NOT NULL DEFAULT 'personal'
              CHECK (category IN ('personal', 'work', 'study')),
  created_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE tags (
  id    INTEGER PRIMARY KEY,
  name  TEXT NOT NULL UNIQUE
);

CREATE TABLE note_tags (
  note_id  INTEGER NOT NULL,
  tag_id   INTEGER NOT NULL,
  PRIMARY KEY (note_id, tag_id),
  FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id)  REFERENCES tags(id)  ON DELETE CASCADE
);
```

## Example queries

**1. One user's notes, newest first** (this backs `GET /notes`):

```sql
SELECT id, title, category, created_at
FROM notes
WHERE user_id = 7
ORDER BY created_at DESC
LIMIT 10 OFFSET 0;
```

**2. All of a user's notes tagged "urgent"** (two JOINs, this backs `GET /notes?tag=urgent`):

```sql
SELECT notes.id, notes.title
FROM notes
JOIN note_tags ON note_tags.note_id = notes.id
JOIN tags      ON tags.id = note_tags.tag_id
WHERE tags.name = 'urgent'
  AND notes.user_id = 7;
```

**3. How many notes each user has** (includes users with zero notes):

```sql
SELECT users.name, COUNT(notes.id) AS note_count
FROM users
LEFT JOIN notes ON notes.user_id = users.id
GROUP BY users.id;
```

## Indexes

```sql
CREATE INDEX idx_notes_user_created ON notes (user_id, created_at);
CREATE INDEX idx_note_tags_tag ON note_tags (tag_id);
```

- **`notes (user_id, created_at)`:** almost every request asks for one user's notes, newest first. Without this index the database would scan all the notes of all users. With it, the database jumps straight to that user's rows already in date order.
- **`note_tags (tag_id)`:** the primary key already helps "which tags does this note have?", but "which notes have this tag?" searches by `tag_id` alone and needs its own index.

Primary keys and unique columns (such as `users.email` and `tags.name`) are indexed automatically. Indexes speed up reads but slightly slow writes and use extra storage, so they are only added where the queries need them.

## SQL or NoSQL?

I would choose SQL (a relational database such as PostgreSQL). QuickNotes data is structured and connected: users own notes, and notes have tags. A relational database enforces these links with foreign keys, protects against bad data with constraints (such as the 100-character title and the unique email), and answers questions across tables, like "all urgent notes for this user", with one JOIN query. Transactions also keep multi-step changes safe, for example creating a note and its tags together or not at all. NoSQL would suit data that changes shape often or needs enormous write scale, but QuickNotes is a read-heavy app with a stable structure, so the guarantees of SQL are worth more than the flexibility of NoSQL.