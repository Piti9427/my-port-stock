const tickerInput = document.getElementById("tickerInput");
const modeInput = document.getElementById("modeInput");
const analyzeButton = document.getElementById("analyzeButton");
const decisionSnapshot = document.getElementById("decisionSnapshot");
const dataQuality = document.getElementById("dataQuality");
const riskPlan = document.getElementById("riskPlan");
const journalStatus = document.getElementById("journalStatus");
const watchTriggers = document.getElementById("watchTriggers");
const pixelAgent = document.getElementById("pixelAgent");
const pixelLabel = document.getElementById("pixelLabel");

function setPixelState(state, verdict) {
  pixelAgent.classList.remove("green", "yellow", "red");
  pixelAgent.classList.add(state || "yellow");
  pixelLabel.textContent = String(verdict || "WAIT").toUpperCase();
}

function renderSnapshot(snapshot) {
  decisionSnapshot.innerHTML = "";
  const rows = [
    ["Status", `${snapshot.traffic_light_status} / ${snapshot.verdict}`],
    ["Ticker", snapshot.ticker],
    ["Mode", snapshot.decision_mode],
    ["Score", snapshot.score ?? "N/A"],
    ["Gate", snapshot.gate_status],
    ["Reason", snapshot.one_line_reason],
    ["Next", snapshot.immediate_next_action],
  ];

  for (const [label, value] of rows) {
    const dt = document.createElement("dt");
    const dd = document.createElement("dd");
    dt.textContent = label;
    dd.textContent = value;
    decisionSnapshot.append(dt, dd);
  }
}

function renderList(target, items) {
  target.innerHTML = "";
  for (const item of items || []) {
    const li = document.createElement("li");
    li.textContent = item;
    target.appendChild(li);
  }
}

async function analyze() {
  const ticker = tickerInput.value.trim().toUpperCase();
  const decisionMode = modeInput.value;

  analyzeButton.disabled = true;
  analyzeButton.textContent = "Loading...";

  try {
    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ticker,
        decision_mode: decisionMode,
      }),
    });
    const payload = await response.json();
    const snapshot = payload.decision_snapshot;

    renderSnapshot(snapshot);
    setPixelState(snapshot.traffic_light_status, snapshot.verdict);

    dataQuality.textContent = JSON.stringify(
      payload.adaptive_drilldown ? payload.adaptive_drilldown.data_quality : payload,
      null,
      2,
    );
    riskPlan.textContent = JSON.stringify(
      payload.adaptive_drilldown ? payload.adaptive_drilldown.risk_plan : {},
      null,
      2,
    );
    journalStatus.textContent = JSON.stringify(
      payload.adaptive_drilldown
        ? payload.adaptive_drilldown.portfolio_journal.journal_context
        : {},
      null,
      2,
    );
    renderList(
      watchTriggers,
      payload.adaptive_drilldown ? payload.adaptive_drilldown.watch_triggers : [],
    );
  } catch (error) {
    setPixelState("red", "ERROR");
    dataQuality.textContent = error.message;
  } finally {
    analyzeButton.disabled = false;
    analyzeButton.textContent = "Analyze";
  }
}

analyzeButton.addEventListener("click", analyze);
tickerInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    analyze();
  }
});

analyze();
