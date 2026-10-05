const apiStatus = document.querySelector("#api-status");
const queryForm = document.querySelector("#query-form");
const queryText = document.querySelector("#query-text");
const queryResult = document.querySelector("#query-result");
const submitButton = queryForm.querySelector("button");

async function checkApi() {
  try {
    const response = await fetch("/api/health");
    if (!response.ok) {
      throw new Error("The API returned an error.");
    }

    apiStatus.textContent = "Online";
    apiStatus.dataset.state = "ok";
  } catch {
    apiStatus.textContent = "Unavailable";
    apiStatus.dataset.state = "error";
  }
}

queryForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const text = queryText.value.trim();
  if (!text) return;

  submitButton.disabled = true;
  queryResult.textContent = "Running query…";

  try {
    const params = new URLSearchParams({ text });
    const response = await fetch(`/api/db/example?${params}`);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "The query failed.");
    }

    queryResult.textContent = JSON.stringify(result, null, 2);
  } catch (error) {
    queryResult.textContent = error.message;
  } finally {
    submitButton.disabled = false;
  }
});

checkApi();
