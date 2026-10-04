# QuickNotes System Design

QuickNotes is moving from a browser-only app to an online service for 1 million users. This project has two parts: a small API client that talks to the JSONPlaceholder practice API (GET, POST and DELETE with loading, success, error and empty states), and design documents for the real backend: an API design, a data model and a scalable architecture.

## How to run the API client

1. Clone the repository: `git clone https://github.com/tweety-KM/quicknotes-system-design.git`
2. Open the `quicknotes-system-design` folder.
3. Open `index.html` in a browser (or use the Live Server extension in VS Code). An internet connection is needed.
4. Click **Load notes** to fetch 10 notes, use the form to create one, and click **Delete** on any note.

JSONPlaceholder does not really save new notes, so a created note disappears when the page is reloaded. This is expected.

## Design documents

- [API design](docs/api-design.md): REST endpoints, JSON examples and error codes
- [Data model](docs/data-model.md): tables, relationships, SQL, indexes and the SQL vs NoSQL decision
- [Architecture](docs/architecture.md): requirements, load estimates, diagram, request flows and trade-offs

## What I learned

- How to use fetch with async/await, try/catch/finally and a response.ok check and how to show loading, success, error and empty states.
- How to design a RESTful API with the right methods, paths, status codes and error bodies.
- How to model data with primary keys, foreign keys and a join table for many-to-many relationships.
- How to estimate load and use a CDN, load balancer, cache, read replica and queue to scale a read-heavy system, and how to avoid single points of failure.
- How to make small, meaningful Git commits as each part is completed.