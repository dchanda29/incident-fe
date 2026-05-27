import "./styles.css";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "/api";

const form = document.querySelector("#incident-form");
const submitButton = document.querySelector("#submit-button");
const resetButton = document.querySelector("#reset-button");
const emptyState = document.querySelector("#empty-state");
const result = document.querySelector("#result");

const summary = document.querySelector("#summary");
const confidenceValue = document.querySelector("#confidence-value");
const rootCause = document.querySelector("#root-cause");
const services = document.querySelector("#services");
const actionsList = document.querySelector("#actions-list");
const evidenceList = document.querySelector("#evidence-list");

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(form);
  const payload = {
    question: formData.get("question"),
    severity: formData.get("severity"),
  };

  const service = formData.get("service");
  if (service) {
    payload.service = service;
  }

  submitButton.disabled = true;
  submitButton.textContent = "Analyzing...";

  try {
    const response = await fetch(`${apiBaseUrl}/incidents/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Request failed with ${response.status}`);
    }

    renderReport(await response.json());
  } catch (error) {
    renderError(error);
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Analyze Incident";
  }
});

resetButton.addEventListener("click", () => {
  form.reset();
  result.classList.add("hidden");
  emptyState.classList.remove("hidden");
});

function renderReport(report) {
  emptyState.classList.add("hidden");
  result.classList.remove("hidden");

  summary.textContent = report.summary;
  confidenceValue.textContent = `${Math.round(report.confidence * 100)}%`;
  rootCause.textContent = report.likely_root_cause;

  services.replaceChildren(
    ...report.impacted_services.map((service) => {
      const chip = document.createElement("span");
      chip.className = "chip";
      chip.textContent = service;
      return chip;
    }),
  );

  actionsList.replaceChildren(
    ...report.recommended_actions.map((action) => {
      const item = document.createElement("li");
      item.textContent = action;
      return item;
    }),
  );

  evidenceList.replaceChildren(
    ...report.evidence.map((evidence) => {
      const item = document.createElement("section");
      item.className = "evidence-item";

      const header = document.createElement("header");
      const title = document.createElement("h4");
      const badge = document.createElement("span");
      const details = document.createElement("p");

      title.textContent = evidence.title;
      badge.className = `source-badge source-${evidence.source}`;
      badge.textContent = `${evidence.source} ${Math.round(evidence.score * 100)}%`;
      details.textContent = evidence.details;

      header.append(title, badge);
      item.append(header, details);
      return item;
    }),
  );
}

function renderError(error) {
  emptyState.classList.add("hidden");
  result.classList.remove("hidden");

  summary.textContent = "Unable to analyze incident";
  confidenceValue.textContent = "0%";
  rootCause.textContent = error.message;
  services.replaceChildren();
  actionsList.replaceChildren();
  evidenceList.replaceChildren();
}

