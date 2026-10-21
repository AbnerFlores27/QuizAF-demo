const apiStatus = document.querySelector("#api-status");
const queryForm = document.querySelector("#query-form, #name-form");
const queryText = document.querySelector("#query-text, #name-input");
const queryResult = document.querySelector("#query-result, #response");
const submitButton = queryForm?.querySelector('button[type="submit"], button:not([type])');

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

if (apiStatus) {
  checkApi();
}

if (queryForm && queryText && queryResult) {
  queryForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const text = queryText.value.trim();
    if (!text) return;

    if (submitButton) submitButton.disabled = true;
    queryResult.textContent = "Sending to PostgreSQL…";

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
      if (submitButton) submitButton.disabled = false;
    }
  });
}
