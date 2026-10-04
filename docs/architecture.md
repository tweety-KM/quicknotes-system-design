# QuickNotes Architecture

## Requirements

### Functional
- Users can register and log in.
- Users can create, view, edit and delete their own notes.
- Notes have a title (up to 100 characters), a body, a category and tags.
- Users can search notes and filter them by tag.
- Users receive reminder emails for notes that have a due date.

### Non-functional
- **Scalability:** support 1 million users and grow without a redesign.
- **Availability:** about 99.9% uptime, with no single point of failure.
- **Performance:** most reads answered in under 200 ms.
- **Durability:** a saved note is never lost.
- **Security:** HTTPS everywhere, hashed passwords and users can only access their own notes.

## Load estimate for 1 million users

### Assumptions
- 1,000,000 registered users, 30% active per day, so **300,000 daily active users**.
- Each active user makes 30 read requests per day (opening the app, scrolling, searching) and 4 write requests per day (3 creates and 1 delete).
- An average note takes 1 KB including its metadata.
- One day has 86,400 seconds, and peak traffic is 5 times the average.

### Estimates
- **Reads per second:** 300,000 x 30 = 9,000,000 per day, divided by 86,400 is **about 104 per second on average and about 520 at peak**.
- **Writes per second:** 300,000 x 4 = 1,200,000 per day, divided by 86,400 is **about 14 per second on average and about 70 at peak**.
- **Storage per year:** 300,000 x 3 = 900,000 new notes per day, times 365 is about 328 million notes, times 1 KB is **about 330 GB per year**. With a read replica the total is about 660 GB.
- **Read or write heavy?** Reads outnumber writes by about 7 to 1, so QuickNotes is **read-heavy**. Caching and read replicas matter most.

## Architecture diagram

```text
                      +----------+
                      |  Client  |
                      | (browser,|
                      |  mobile) |
                      +----+-----+
                           |
                           v
                      +----------+
                      |   DNS    |  name -> address of the CDN / load balancer
                      +----+-----+
                           |
                           v
                      +----------+
                      |   CDN    |  caches static files (HTML, CSS, JS, images)
                      +----+-----+
                           |
                           v
                  +-----------------+
                  |  Load balancer  |
                  +--------+--------+
                           |
          +----------------+----------------+
          |                                 |
          v                                 v
   +-------------+                   +-------------+
   | App server 1|                   | App server 2|   (add more as needed)
   +------+------+                   +------+------+
          |                                 |
          +----------+----------+-----------+
                     |          |           |
         reads       |          |           |   writes
      +--------------+          |           +---------------+
      |                         |                           |
      v                         v                           v
 +---------+            +---------------+            +--------------+
 |  Cache  |            |   Database    |            |    Queue     |
 | (Redis) |            |   Primary     |            | (background  |
 +---------+            |  (all writes) |            |    jobs)     |
                        |       |       |            +------+-------+
                        |       v       |                   |
                        | Read replica  |                   v
                        |  (read-only)  |            +--------------+
                        +---------------+            |    Worker    |
                                                     | (emails,     |
                                                     |  search      |
                                                     |  indexing)   |
                                                     +--------------+
```

## What each component does

- **Client:** it is what the user sees and uses, and it sends requests such as `GET /notes` to our API.
- **DNS:** it translates the friendly name `api.quicknotes.example` into the address of our servers, and it can point users to a healthy copy if one location fails.
- **CDN:** it keeps copies of static files close to users so pages load quickly and our servers handle fewer requests.
- **Load balancer:** it spreads requests across several app servers so none is overloaded, and it stops sending traffic to a server that has failed.
- **App servers:** they run the API logic (login, create, list, delete), and because they keep no user data themselves we can add more whenever traffic grows.
- **Cache:** it keeps frequently requested results, such as a user's recent notes, in memory so most reads never reach the database.
- **Primary database:** it stores users, notes and tags reliably and handles all the writes.
- **Read replica:** it is a live copy of the database that serves read queries, so the heavy read load does not slow down writes on the primary.
- **Queue:** it holds background jobs such as "send reminder email" so a request can finish quickly instead of waiting for slow work.
- **Worker:** it takes jobs from the queue and does the slow work (sending emails, updating the search index), and it can be scaled separately from the app servers.

## Request flows

### GET /notes
1. The client sends `GET /notes` with its token. DNS resolves the name, and the request reaches the load balancer.
2. The load balancer forwards it to a healthy app server.
3. The app server checks the token and finds the user's id.
4. It looks for the user's notes in the **cache**.
5. **Cache hit:** the app server returns the cached notes immediately (step 8).
6. **Cache miss:** it queries the **read replica** for the user's notes, newest first.
7. It stores the result in the cache with a short expiry time.
8. The app server returns `200 OK` with the JSON list, and the client displays it.

### POST /notes
1. The client sends `POST /notes` with the JSON body and token to the load balancer, which forwards it to an app server.
2. The app server checks the token and validates the body (title required, at most 100 characters). If it is invalid, it returns `400`.
3. It writes the note (and its tags) to the **primary database** in one transaction.
4. It deletes that user's cached note list, so the next read is fresh.
5. If the note has a reminder, it puts a job on the **queue**.
6. It returns `201 Created` with the new note, without waiting for the worker.
7. The **worker** later takes the job from the queue and sends the reminder email. If it fails, the job stays in the queue and is retried.
8. The primary database copies the change to the read replica a moment later.

## Trade-offs

- **Caching vs freshness:** the cache makes reads fast and protects the database, but data can be slightly out of date. We reduce this by clearing a user's cache on every write and using short expiry times.
- **Read replica vs consistency:** the replica handles the heavy read load, but it copies data a moment after the primary, so a user might not see a new note for a split second. We accept this small delay (eventual consistency) for better scale, and can read from the primary right after a write if needed.
- **Queue vs instant results:** the queue keeps requests fast and makes background work retryable, but emails and search updates happen a little later, and we have extra workers to run and monitor.
- **Cost vs availability:** extra app servers, a replica and a second cache cost more money, but they are what keeps the service running during failures.

## Avoiding single points of failure

- **DNS:** use a provider with several name servers.
- **CDN and load balancer:** use a managed, redundant load balancer (or a pair), spread across availability zones.
- **App servers:** run at least two in different availability zones. They are stateless, so any server can take over from another.
- **Cache:** run a replicated cache cluster. If it fails, requests fall back to the database, which is slower but still works.
- **Database:** the read replica can be promoted to primary if the primary fails, and regular backups protect against data loss.
- **Queue and worker:** use a replicated queue and run more than one worker, so jobs are not lost if a worker crashes.