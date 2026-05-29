import "./styles.css";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "/api";
const pseudoApiBaseUrl = import.meta.env.VITE_PSEUDO_API_BASE_URL || "/pseudo-api";
const isProductionHost = !["localhost", "127.0.0.1", ""].includes(window.location.hostname);

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
const simulatedFailurePanel = document.querySelector("#simulated-failure-panel");
const simulatedFailure = document.querySelector("#simulated-failure");
const scenarioButtons = document.querySelectorAll(".scenario-button");
const followUpForm = document.querySelector("#follow-up-form");
const followUpQuestion = document.querySelector("#follow-up-question");
const followUpButton = document.querySelector("#follow-up-button");
const followUpThread = document.querySelector("#follow-up-thread");
const suggestedQuestions = document.querySelector("#suggested-questions");

let currentReport = null;

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
    const endpoint = `${apiBaseUrl}/incidents/analyze`;
    assertProductionApiUrl(apiBaseUrl, "VITE_API_BASE_URL");

    const report = await requestJson(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    renderReport(report);
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
  simulatedFailurePanel.classList.add("hidden");
  currentReport = null;
  followUpThread.replaceChildren();
  suggestedQuestions.replaceChildren();
});

scenarioButtons.forEach((button) => {
  button.addEventListener("click", async () => {
    const scenario = button.dataset.scenario;

    setScenarioLoading(button, true);

    try {
      const endpoint = `${pseudoApiBaseUrl}/demo/incidents/${scenario}`;
      assertProductionApiUrl(pseudoApiBaseUrl, "VITE_PSEUDO_API_BASE_URL");

      const demo = await requestJson(endpoint, {
        method: "POST",
      });

      simulatedFailurePanel.classList.remove("hidden");
      simulatedFailure.textContent = JSON.stringify(demo.simulated_failure, null, 2);
      renderReport(demo.triage_report);
    } catch (error) {
      simulatedFailurePanel.classList.add("hidden");
      renderError(error);
    } finally {
      setScenarioLoading(button, false);
    }
  });
});

followUpForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!currentReport) {
    renderError(new Error("Run an incident analysis before asking a follow-up question."));
    return;
  }

  const question = followUpQuestion.value.trim();
  if (!question) {
    return;
  }

  followUpButton.disabled = true;
  followUpButton.textContent = "Asking...";
  appendFollowUpMessage("question", question);
  followUpQuestion.value = "";

  try {
    const endpoint = `${apiBaseUrl}/incidents/follow-up`;
    assertProductionApiUrl(apiBaseUrl, "VITE_API_BASE_URL");

    const response = await requestJson(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question,
        incident_report: currentReport,
      }),
    });

    appendFollowUpMessage("answer", response.answer, response.grounded_in);
    renderSuggestedQuestions(response.suggested_next_questions);
  } catch (error) {
    appendFollowUpMessage("answer error", error.message);
  } finally {
    followUpButton.disabled = false;
    followUpButton.textContent = "Ask";
  }
});

function renderReport(report) {
  currentReport = report;
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

  followUpThread.replaceChildren();
  renderSuggestedQuestions([
    "What should I check first?",
    "How do I verify the root cause?",
    "Should I rollback or fix forward?",
  ]);
}

function setScenarioLoading(button, isLoading) {
  if (!button.dataset.label) {
    button.dataset.label = button.textContent;
  }

  button.disabled = isLoading;
  button.textContent = isLoading ? "Running..." : button.dataset.label;
}

async function requestJson(endpoint, options) {
  const response = await fetch(endpoint, options);
  const text = await response.text();

  if (!response.ok) {
    throw new Error(
      `Request to ${endpoint} failed with ${response.status}. ${text || response.statusText}`,
    );
  }

  return text ? JSON.parse(text) : null;
}

function assertProductionApiUrl(baseUrl, envName) {
  if (isProductionHost && baseUrl.startsWith("/")) {
    throw new Error(
      `${envName} is not configured in Vercel. Set it to the deployed API URL and redeploy.`,
    );
  }
}

function appendFollowUpMessage(kind, text, groundedIn = []) {
  const message = document.createElement("section");
  message.className = `follow-up-message ${kind.includes("question") ? "user-message" : "agent-message"}`;

  const label = document.createElement("strong");
  label.textContent = kind.includes("question") ? "You" : "Assistant";

  const body = document.createElement("p");
  body.textContent = text;

  message.append(label, body);

  if (groundedIn.length) {
    const chips = document.createElement("div");
    chips.className = "grounded-chips";

    groundedIn.forEach((item) => {
      const chip = document.createElement("span");
      chip.className = "chip";
      chip.textContent = item;
      chips.append(chip);
    });

    message.append(chips);
  }

  followUpThread.append(message);
  message.scrollIntoView({ block: "nearest" });
}

function renderSuggestedQuestions(questions) {
  suggestedQuestions.replaceChildren(
    ...questions.map((question) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "suggestion-button";
      button.textContent = question;
      button.addEventListener("click", () => {
        followUpQuestion.value = question;
        followUpQuestion.focus();
      });
      return button;
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
  simulatedFailurePanel.classList.add("hidden");
  currentReport = null;
  followUpThread.replaceChildren();
  suggestedQuestions.replaceChildren();
}
