const API_URL = "https://jsonplaceholder.typicode.com/posts";

const loadBtn = document.querySelector("#load-btn");
const statusText = document.querySelector("#status");
const list = document.querySelector("#notes-list");
const form = document.querySelector("#note-form");
const titleInput = document.querySelector("#title-input");
const bodyInput = document.querySelector("#body-input");
const submitBtn = document.querySelector("#submit-btn");

// ---------- Helpers ----------

// Show a message in #status. type is "loading", "success" or "error".
function setStatus(message, type) {
  statusText.textContent = message;
  statusText.className = `status-${type}`;
}

// Reusable request: calls fetch, checks response.ok, throws on errors.
// Returns the parsed JSON and the status code.
async function request(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  const data = await response.json();
  return { data, status: response.status };
}

// Show the empty-state message in the list.
function showEmptyState() {
  const li = document.createElement("li");
  li.classList.add("empty-state");
  li.textContent = "No notes to show.";
  list.appendChild(li);
}

// Build one note card. User text is inserted with textContent only.
function createNoteItem(note) {
  const li = document.createElement("li");
  li.classList.add("note");

  const title = document.createElement("h3");
  title.textContent = note.title;

  const body = document.createElement("p");
  body.textContent = note.body || "";

  li.append(title, body);
  return li;
}

// ---------- GET: load notes ----------
async function loadNotes() {
  setStatus("Loading notes...", "loading");
  loadBtn.disabled = true;
  list.replaceChildren();

  try {
    const { data: notes } = await request(`${API_URL}?_limit=10`);

    if (notes.length === 0) {
      showEmptyState();
      setStatus("No notes found on the server.", "success");
    } else {
      notes.forEach((note) => list.appendChild(createNoteItem(note)));
      setStatus(`Loaded ${notes.length} notes from the server.`, "success");
    }
  } catch (error) {
    setStatus("Could not load notes. Please try again.", "error");
    console.error(error);
  } finally {
    loadBtn.disabled = false;
  }
}

loadBtn.addEventListener("click", loadNotes);