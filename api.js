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

  const del = document.createElement("button");
  del.type = "button";
  del.textContent = "Delete";
  del.classList.add("delete-btn");
  del.addEventListener("click", () => deleteNote(note.id, li, del));

  li.append(title, body, del);
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
// ---------- POST: create a note ----------
form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const title = titleInput.value.trim();
  const body = bodyInput.value.trim();

  // Validation: title is required (max 100 characters); body is optional
  if (title === "") {
    setStatus("Please enter a title.", "error");
    return;
  }
  if (title.length > 100) {
    setStatus("The title must be 100 characters or fewer.", "error");
    return;
  }

  submitBtn.disabled = true;
  setStatus("Creating note...", "loading");

  try {
    const { data: created, status } = await request(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title, body: body, userId: 1 }),
    });

    // Remove the empty-state message if it is showing
    const empty = list.querySelector(".empty-state");
    if (empty) empty.remove();

    list.prepend(createNoteItem(created));
    setStatus(`Note created (status ${status}, id ${created.id}).`, "success");
    form.reset();
  } catch (error) {
    setStatus("Could not create the note. Please try again.", "error");
    console.error(error);
  } finally {
    submitBtn.disabled = false;
  }
});
// ---------- DELETE: remove a note ----------

// JSONPlaceholder is a fake API: it never really stores notes we create.
// Real posts have ids 1 to 100. A note we create comes back with id 101,
// which does not exist on the server, so a real DELETE for it would not be
// meaningful. We therefore send DELETE only for real server notes (id <= 100)
// and simply remove locally created notes from the page. A real backend would
// store every note, so every delete would go to the server.
const SERVER_NOTE_LIMIT = 100;

async function deleteNote(id, li, button) {
  button.disabled = true;
  setStatus("Deleting note...", "loading");

  try {
    if (id <= SERVER_NOTE_LIMIT) {
      await request(`${API_URL}/${id}`, { method: "DELETE" });
    }

    li.remove();
    if (list.children.length === 0) showEmptyState();
    setStatus(`Note ${id} deleted.`, "success");
  } catch (error) {
    button.disabled = false;
    setStatus("Could not delete the note. Please try again.", "error");
    console.error(error);
  }
}