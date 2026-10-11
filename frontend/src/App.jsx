
/* =========================================================
   FRAUDSENTINEL AI
   Main application component
   Purpose: Transaction fraud detection and investigation UI
   ========================================================= */

// React hooks and application styles
import { useEffect, useState } from "react";
import "./App.css";

// Chart.js components and React chart wrappers
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
} from "chart.js";
import { Doughnut, Bar } from "react-chartjs-2";

// Register chart components used by the Overview dashboard
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement
);

/* =========================================================
   DATE RANGE HELPER
   Creates API date filters from the selected date preset.
   ========================================================= */

function getDateRange(preset, customStart, customEnd) {
  const now = new Date();

  // Use the dates selected by the user for a custom range.
  if (preset === "custom") {
    return {
      start_date: customStart
        ? new Date(`${customStart}T00:00:00`).toISOString()
        : "",
      end_date: customEnd
        ? new Date(`${customEnd}T23:59:59.999`).toISOString()
        : "",
    };
  }

  // Start with today's date at midnight.
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  // Calculate the start date for the selected preset.
  if (preset === "today") {
    // Keep today's midnight as the start date.
  } else if (preset === "7days") {
    start.setDate(start.getDate() - 6);
  } else if (preset === "30days") {
    start.setDate(start.getDate() - 29);
  } else {
    // An empty range represents all available dates.
    return { start_date: "", end_date: "" };
  }

  return {
    start_date: start.toISOString(),
    end_date: now.toISOString(),
  };
}

/* =========================================================
   API CONFIGURATION AND FORMATTERS
   ========================================================= */

// Base URL of the FastAPI backend.
const API_URL = "http://127.0.0.1:8000";

// Format transaction amounts as Indian Rupees.
const money = (value) =>
  Number(value || 0).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  });

// Convert a probability value into a percentage string.
const percent = (value) =>
  `${(Number(value || 0) * 100).toFixed(2)}%`;

// Convert risk labels into safe CSS class names.
const riskClass = (value) =>
  String(value || "unknown").toLowerCase().replace(/[^a-z-]/g, "");

/* =========================================================
   MAIN APPLICATION COMPONENT
   ========================================================= */

function App() {
  /* ---------------------------------------------------------
     APPLICATION STATUS AND NAVIGATION STATE
     --------------------------------------------------------- */

  const [apiStatus, setApiStatus] = useState("Checking...");
  const [modelStatus, setModelStatus] = useState("Checking...");
  const [activePage, setActivePage] = useState("Overview");

  /* ---------------------------------------------------------
     TRANSACTION INPUT AND PREDICTION STATE
     --------------------------------------------------------- */

  const [type, setType] = useState("TRANSFER");
  const [amount, setAmount] = useState("5000");
  const [step, setStep] = useState("10");
  const [balance, setBalance] = useState("10000");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  /* ---------------------------------------------------------
     TRANSACTION HISTORY STATE
     --------------------------------------------------------- */

  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");

  /* ---------------------------------------------------------
     FRAUD ALERTS STATE
     --------------------------------------------------------- */

  const [alerts, setAlerts] = useState([]);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [alertsError, setAlertsError] = useState("");

  /* ---------------------------------------------------------
     DASHBOARD STATISTICS STATE
     --------------------------------------------------------- */

  const [dashboardStats, setDashboardStats] = useState(null);

  /* ---------------------------------------------------------
     INVESTIGATION STATE
     --------------------------------------------------------- */

  const [investigations, setInvestigations] = useState([]);
  const [investigationsLoading, setInvestigationsLoading] = useState(false);
  const [investigationsError, setInvestigationsError] = useState("");
  const [investigationNotes, setInvestigationNotes] = useState({});
  const [investigationFilter, setInvestigationFilter] = useState("ALL");

  /* ---------------------------------------------------------
     THEME, SEARCH, NOTIFICATION AND DATE FILTER STATE
     --------------------------------------------------------- */

  const [theme, setTheme] = useState(
    () => localStorage.getItem("fraudsentinel-theme") || "dark"
  );
  const [transactionSearch, setTransactionSearch] = useState("");
  const [alertSearch, setAlertSearch] = useState("");
  const [notice, setNotice] = useState("");
  const [datePreset, setDatePreset] = useState("7days");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  /* ---------------------------------------------------------
     SIDEBAR NAVIGATION ITEMS
     --------------------------------------------------------- */

  const navigation = [
    { name: "Overview", icon: "▦" },
    { name: "Transactions", icon: "⇄" },
    { name: "Fraud Alerts", icon: "⚠" },
    { name: "Investigations", icon: "⌕" },
  ];

  /* =========================================================
     EFFECT: SAVE THE SELECTED THEME
     Persists the theme preference in local storage.
     ========================================================= */

  useEffect(() => {
    localStorage.setItem("fraudsentinel-theme", theme);
  }, [theme]);

  /* =========================================================
     EFFECT: CHECK BACKEND AND MODEL STATUS
     Checks whether the API and trained model are available.
     ========================================================= */

  useEffect(() => {
    let cancelled = false;

    async function checkServices() {
      // Check the FastAPI health endpoint.
      try {
        const response = await fetch(`${API_URL}/health`);

        if (!response.ok) {
          throw new Error("API unavailable");
        }

        const data = await response.json();

        if (!cancelled) {
          setApiStatus(data.status || "healthy");
        }
      } catch {
        if (!cancelled) {
          setApiStatus("offline");
        }
      }

      // Check whether the trained model is loaded.
      try {
        const response = await fetch(`${API_URL}/model-status`);

        if (!response.ok) {
          throw new Error("Model unavailable");
        }

        const data = await response.json();

        if (!cancelled) {
          setModelStatus(
            data.status === "loaded" ? "loaded" : "unavailable"
          );
        }
      } catch {
        if (!cancelled) {
          setModelStatus("unavailable");
        }
      }
    }

    checkServices();

    // Prevent state updates after the component unmounts.
    return () => {
      cancelled = true;
    };
  }, []);

  /* =========================================================
     API FUNCTION: LOAD TRANSACTION HISTORY
     Fetches saved predictions using the selected date range.
     ========================================================= */

  async function loadHistory() {
    setHistoryLoading(true);
    setHistoryError("");

    try {
      const query = new URLSearchParams({ limit: "50" });
      const range = getDateRange(datePreset, startDate, endDate);

      // Add the start date when a date range is selected.
      if (range.start_date) {
        query.set("start_date", range.start_date);
      }

      // Add the end date when a date range is selected.
      if (range.end_date) {
        query.set("end_date", range.end_date);
      }

      const response = await fetch(
        `${API_URL}/history?${query.toString()}`
      );

      if (!response.ok) {
        throw new Error("Could not load transaction history.");
      }

      setHistory(await response.json());
    } catch (err) {
      setHistoryError(
        err.message || "Could not load transaction history."
      );
    } finally {
      setHistoryLoading(false);
    }
  }

  /* =========================================================
     API FUNCTION: LOAD FRAUD ALERTS
     Fetches flagged transactions using the selected date range.
     ========================================================= */

  async function loadAlerts() {
    setAlertsLoading(true);
    setAlertsError("");

    try {
      const query = new URLSearchParams({ limit: "50" });
      const range = getDateRange(datePreset, startDate, endDate);

      // Add date filters to the API request when available.
      if (range.start_date) {
        query.set("start_date", range.start_date);
      }

      if (range.end_date) {
        query.set("end_date", range.end_date);
      }

      const response = await fetch(
        `${API_URL}/alerts?${query.toString()}`
      );

      if (!response.ok) {
        throw new Error("Could not load fraud alerts.");
      }

      setAlerts(await response.json());
    } catch (err) {
      setAlertsError(
        err.message || "Could not load fraud alerts."
      );
    } finally {
      setAlertsLoading(false);
    }
  }

  /* =========================================================
     API FUNCTION: LOAD INVESTIGATIONS
     Loads investigation records and their existing analyst notes.
     ========================================================= */

  async function loadInvestigations() {
    setInvestigationsLoading(true);
    setInvestigationsError("");

    try {
      const response = await fetch(`${API_URL}/investigations`);

      if (!response.ok) {
        throw new Error("Failed to load investigations.");
      }

      const data = await response.json();

      setInvestigations(data);

      // Populate the notes state from saved investigation records.
      setInvestigationNotes(
        Object.fromEntries(
          data.map((item) => [
            item.prediction_id,
            item.analyst_notes || "",
          ])
        )
      );
    } catch (err) {
      setInvestigationsError(
        err.message || "Failed to load investigations."
      );
    } finally {
      setInvestigationsLoading(false);
    }
  }

  /* =========================================================
     API FUNCTION: SAVE INVESTIGATION CHANGES
     Updates the review status and analyst notes for a record.
     ========================================================= */

  async function saveInvestigation(item, newStatus, notes) {
    try {
      const response = await fetch(
        `${API_URL}/investigations/${item.prediction_id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            review_status: newStatus,
            analyst_notes:
              notes ?? investigationNotes[item.prediction_id] ?? "",
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Failed to save investigation."
        );
      }

      // Update the matching investigation with the saved API response.
      setInvestigations((current) =>
        current.map((investigation) =>
          investigation.prediction_id === data.prediction_id
            ? {
                ...investigation,
                review_status: data.review_status,
                analyst_notes: data.analyst_notes,
              }
            : investigation
        )
      );

      // Keep the notes input synchronized with the saved value.
      setInvestigationNotes((current) => ({
        ...current,
        [data.prediction_id]: data.analyst_notes || "",
      }));

      setNotice("Investigation saved successfully.");

      // Clear the notification after three seconds.
      window.setTimeout(() => setNotice(""), 3000);
    } catch (err) {
      setNotice(err.message || "Failed to save investigation.");
    }
  }

  /* =========================================================
     API FUNCTION: LOAD DASHBOARD STATISTICS
     Retrieves aggregate transaction metrics from the backend.
     ========================================================= */

  async function loadDashboardStats() {
    try {
      const response = await fetch(`${API_URL}/dashboard-stats`);

      if (!response.ok) {
        throw new Error("Failed to load dashboard stats");
      }

      setDashboardStats(await response.json());
    } catch (err) {
      console.error("Dashboard stats error:", err);
    }
  }

  /* =========================================================
     EFFECT: LOAD DATA FOR THE ACTIVE PAGE
     Calls the required API functions when navigation changes.
     ========================================================= */

  useEffect(() => {
    if (activePage === "Overview") {
      loadDashboardStats();
      loadHistory();
      loadAlerts();
    }

    if (activePage === "Transactions") {
      loadHistory();
    }

    if (activePage === "Fraud Alerts") {
      loadAlerts();
    }

    if (activePage === "Investigations") {
      loadInvestigations();
    }
  }, [activePage]);

  /* =========================================================
     FORM HANDLER: ANALYZE A TRANSACTION
     Sends transaction inputs to the prediction API.
     ========================================================= */

  async function analyzeTransaction(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch(`${API_URL}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          amount: Number(amount),
          step: Number(step),
          oldbalanceOrg: Number(balance),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Prediction request failed.");
      }

      setResult(data);

      // Refresh the dashboard data after a successful prediction.
      await Promise.all([
        loadDashboardStats(),
        loadHistory(),
        loadAlerts(),
      ]);
    } catch (err) {
      setError(
        `${err.message} Check that FastAPI is running at ${API_URL}.`
      );
    } finally {
      setLoading(false);
    }
  }


  /* ---------------------------------------------------------
     FILTER INVESTIGATIONS, TRANSACTIONS AND FRAUD ALERTS
     Search and status filters for the respective tables.
     --------------------------------------------------------- */

  const filteredInvestigations = investigations.filter(
    (item) =>
      investigationFilter === "ALL" ||
      (item.review_status || "PENDING") === investigationFilter
  );

  const filteredHistory = history.filter((item) =>
    `${item.id} ${item.transaction_type} ${item.prediction} ${item.risk_level}`
      .toLowerCase()
      .includes(transactionSearch.toLowerCase())
  );

  const filteredAlerts = alerts.filter((item) =>
    `${item.id} ${item.transaction_type} ${item.risk_level}`
      .toLowerCase()
      .includes(alertSearch.toLowerCase())
  );

  /* ---------------------------------------------------------
     DASHBOARD SUMMARY METRICS
     Prefer backend statistics; use loaded records as fallbacks.
     --------------------------------------------------------- */

  const totalTransactions =
    dashboardStats?.total_transactions ?? history.length;

  const flaggedTransactions =
    dashboardStats?.flagged_transactions ?? alerts.length;

  const highRiskTransactions =
    dashboardStats?.high_risk_transactions ??
    alerts.filter((item) => riskClass(item.risk_level) === "high").length;

  const averageProbability = dashboardStats
    ? `${dashboardStats.avg_fraud_probability}%`
    : "—";

  /* ---------------------------------------------------------
     RECENT PREDICTIONS
     Use up to 50 recent history records for dashboard charts.
     --------------------------------------------------------- */

  const recentPredictions = history.slice(0, 50);

  // Identify predictions that were flagged for manual review.
  const isFraudPrediction = (item) =>
    String(item.prediction || "").toUpperCase() === "FLAG_FOR_REVIEW";

  const fraudCount = recentPredictions.filter(isFraudPrediction).length;

  // Count predictions that were not flagged.
  const legitimateCount = recentPredictions.filter(
    (item) =>
      String(item.prediction || "").toUpperCase() === "NOT_FLAGGED"
  ).length;

  // Count records with missing or unrecognized prediction labels.
  const unknownPredictionCount =
    recentPredictions.length - fraudCount - legitimateCount;

  /* ---------------------------------------------------------
     DOUGHNUT CHART DATA
     Shows flagged, unflagged and unknown predictions.
     --------------------------------------------------------- */

  const doughnutData = {
    labels: ["Flagged for Review", "Not Flagged", "Unknown"],
    datasets: [
      {
        data: [fraudCount, legitimateCount, unknownPredictionCount],
        backgroundColor: ["#A3F7B5", "#365541", "#8B9A90"],
        borderColor: theme === "dark" ? "#101813" : "#FFFFFF",
        borderWidth: 3,
      },
    ],
  };

  /* ---------------------------------------------------------
     RISK DISTRIBUTION
     Groups recent predictions by risk level.
     --------------------------------------------------------- */

  const riskCounts = recentPredictions.reduce((counts, item) => {
    const risk = String(item.risk_level || "unknown").toLowerCase();

    const key = ["low", "medium", "high"].includes(risk)
      ? risk
      : "unknown";

    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});

  /* ---------------------------------------------------------
     BAR CHART DATA: RISK DISTRIBUTION
     --------------------------------------------------------- */

  const riskChartData = {
    labels: ["Low", "Medium", "High", "Unknown"],
    datasets: [
      {
        label: "Saved predictions",
        data: [
          riskCounts.low || 0,
          riskCounts.medium || 0,
          riskCounts.high || 0,
          riskCounts.unknown || 0,
        ],
        backgroundColor: ["#A3F7B5", "#D6C879", "#F08B8B", "#8B9A90"],
        borderRadius: 6,
      },
    ],
  };

  /* ---------------------------------------------------------
     BAR CHART DATA: TRANSACTION STATISTICS
     Uses totals returned by the backend API.
     --------------------------------------------------------- */

  const transactionChartData = {
    labels: ["Total", "Flagged", "High risk"],
    datasets: [
      {
        label: "Backend totals",
        data: [
          dashboardStats?.total_transactions ?? 0,
          dashboardStats?.flagged_transactions ?? 0,
          dashboardStats?.high_risk_transactions ?? 0,
        ],
        backgroundColor: ["#A3F7B5", "#E5C96B", "#F08B8B"],
        borderRadius: 6,
      },
    ],
  };

  /* ---------------------------------------------------------
     SHARED BAR CHART OPTIONS
     Updates chart labels and grid colors with the selected theme.
     --------------------------------------------------------- */

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: theme === "dark" ? "#D9FBE2" : "#24352A",
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: theme === "dark" ? "#D9FBE2" : "#24352A",
        },
        grid: {
          display: false,
        },
      },
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0,
          color: theme === "dark" ? "#D9FBE2" : "#24352A",
        },
        grid: {
          color: theme === "dark" ? "#304638" : "#E1E9E2",
        },
      },
    },
  };

  /* =========================================================
     MAIN UI
     Renders navigation, filters, tables, dashboard and analyzer.
     The return (...) JSX continues in Part 3.
     ========================================================= */
     
  return (
    <div className={`app-shell theme-${theme}`}>
      {/* Sidebar: branding and page navigation */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">F</div>
          <div>
            <h2>
              <span className="fraud-word">Fraud</span>
              <span>Sentinel</span>
            </h2>
            <span className="brand-subtitle">AI SECURITY PLATFORM</span>
          </div>
        </div>

        {/* Navigation links for each application page */}
        <div className="nav-label">WORKSPACE</div>
        <nav aria-label="Main navigation">
          {navigation.map((item) => (
            <button
              key={item.name}
              className={`nav-item ${activePage === item.name ? "active" : ""}`}
              onClick={() => setActivePage(item.name)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.name}</span>
            </button>
          ))}
        </nav>

        {/* Sidebar footer */}
        <div className="sidebar-bottom">
          <div className="security-icon">⌑</div>
          <p>AI-powered transaction monitoring</p>
          <span>FRAUD DETECTION SYSTEM</span>
        </div>
      </aside>

      {/* Main content area */}
      <main className="main-content">
        {/* Header: active page, API status, model status and theme */}
        <header className="topbar">
          <div>
            <p className="eyebrow">FINANCIAL INTELLIGENCE</p>
            <h1>{activePage}</h1>
          </div>

          <div className="header-right">
            <span className="environment">DEVELOPMENT</span>

            <div className="api-indicator">
              <span className={`status-dot ${apiStatus === "healthy" ? "online" : ""}`} />
              API {apiStatus}
            </div>

            <div className="api-indicator">
              <span className={`status-dot ${modelStatus === "loaded" ? "online" : ""}`} />
              Model {modelStatus}
            </div>

            <button
              type="button"
              className="theme-toggle"
              onClick={() =>
                setTheme((current) => current === "dark" ? "light" : "dark")
              }
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            >
              {theme === "dark" ? "☀️ Light mode" : "🌙 Dark mode"}
            </button>
          </div>
        </header>

        {/* Display success or error notifications */}
        {notice && <div className="notice" role="status">{notice}</div>}

        {/* Date filter shared by Overview, Transactions and Fraud Alerts */}
        {["Overview", "Transactions", "Fraud Alerts"].includes(activePage) && (
          <section className="surface date-filter-bar">
            <div className="date-filter-title">
              <h2>Date &amp; Time Filter</h2>
              <p>Filter dashboard data by transaction creation time</p>
            </div>

            <div className="date-filter-controls">
              <label>
                Date range
                <select
                  value={datePreset}
                  onChange={(e) => setDatePreset(e.target.value)}
                >
                  <option value="today">Today</option>
                  <option value="7days">Last 7 days</option>
                  <option value="30days">Last 30 days</option>
                  <option value="custom">Custom range</option>
                  <option value="all">All available dates</option>
                </select>
              </label>

              {/* Show custom date inputs only when required */}
              {datePreset === "custom" && (
                <>
                  <label>
                    Start date
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </label>

                  <label>
                    End date
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </label>
                </>
              )}

              {/* Reload data using the selected date range */}
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  loadDashboardStats();
                  loadHistory();
                  loadAlerts();
                }}
              >
                Apply filter
              </button>
            </div>
          </section>
        )}

        {/* Transactions page: searchable transaction history */}
        {activePage === "Transactions" ? (
          <section className="surface history-section">
            <div className="section-heading">
              <div>
                <h2>Transaction History</h2>
                <p>Saved predictions from PostgreSQL</p>
              </div>

              <div className="heading-actions">
                <input
                  className="search-input"
                  aria-label="Search transactions"
                  placeholder="Search transactions..."
                  value={transactionSearch}
                  onChange={(e) => setTransactionSearch(e.target.value)}
                />

                <button
                  className="secondary-button"
                  onClick={loadHistory}
                  disabled={historyLoading}
                >
                  {historyLoading ? "Loading…" : "↻ Refresh"}
                </button>
              </div>
            </div>

            {historyError && <div className="error-box">{historyError}</div>}

            {historyLoading ? (
              <div className="loading-state">Loading transactions…</div>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Type</th>
                      <th>Amount</th>
                      <th>Fraud Probability</th>
                      <th>Risk</th>
                      <th>Decision</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHistory.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="empty-cell">
                          No saved predictions found.
                        </td>
                      </tr>
                    ) : (
                      filteredHistory.map((item) => (
                        <tr key={item.id}>
                          <td className="mono">{item.id}</td>
                          <td>{item.transaction_type}</td>
                          <td>{money(item.amount)}</td>
                          <td>{percent(item.fraud_probability)}</td>
                          <td>
                            <span className={`risk-badge ${riskClass(item.risk_level)}`}>
                              {item.risk_level}
                            </span>
                          </td>
                          <td>
                            <span className="decision-text">{item.prediction}</span>
                          </td>
                          <td>
                            {item.created_at
                              ? new Date(item.created_at).toLocaleString("en-IN")
                              : "—"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>

        /* Fraud Alerts page: searchable flagged transactions */
        ) : activePage === "Fraud Alerts" ? (
          <section className="surface history-section">
            <div className="section-heading">
              <div>
                <h2>Fraud Alerts</h2>
                <p>Transactions flagged by the fraud detection model</p>
              </div>

              <div className="heading-actions">
                <input
                  className="search-input"
                  aria-label="Search alerts"
                  placeholder="Search alerts..."
                  value={alertSearch}
                  onChange={(e) => setAlertSearch(e.target.value)}
                />

                <button
                  className="secondary-button"
                  onClick={loadAlerts}
                  disabled={alertsLoading}
                >
                  {alertsLoading ? "Loading…" : "↻ Refresh"}
                </button>
              </div>
            </div>

            {alertsError && <div className="error-box">{alertsError}</div>}

            {alertsLoading ? (
              <div className="loading-state">Loading fraud alerts…</div>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Type</th>
                      <th>Amount</th>
                      <th>Fraud Probability</th>
                      <th>Risk</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAlerts.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="empty-cell">
                          No flagged transactions found.
                        </td>
                      </tr>
                    ) : (
                      filteredAlerts.map((item) => (
                        <tr key={item.id}>
                          <td className="mono">{item.id}</td>
                          <td>{item.transaction_type}</td>
                          <td>{money(item.amount)}</td>
                          <td>{percent(item.fraud_probability)}</td>
                          <td>
                            <span className={`risk-badge ${riskClass(item.risk_level)}`}>
                              {item.risk_level}
                            </span>
                          </td>
                          <td>
                            {item.created_at
                              ? new Date(item.created_at).toLocaleString("en-IN")
                              : "—"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>

        /* Investigations page: review status and analyst notes */
        ) : activePage === "Investigations" ? (
          <section className="surface history-section">
            <div className="section-heading">
              <div>
                <h2>Investigations</h2>
                <p>Review and track flagged transactions</p>
              </div>

              <button
                className="secondary-button"
                onClick={loadInvestigations}
                disabled={investigationsLoading}
              >
                {investigationsLoading ? "Loading…" : "↻ Refresh"}
              </button>
            </div>

            {/* Filter investigation records by review status */}
            <div className="filter-bar">
              <label htmlFor="investigation-filter">Filter by status</label>
              <select
                id="investigation-filter"
                value={investigationFilter}
                onChange={(e) => setInvestigationFilter(e.target.value)}
              >
                <option value="ALL">All statuses</option>
                <option value="PENDING">Pending</option>
                <option value="UNDER_REVIEW">Under Review</option>
                <option value="RESOLVED">Resolved</option>
              </select>
            </div>

            {investigationsError && (
              <div className="error-box">{investigationsError}</div>
            )}

            {investigationsLoading ? (
              <div className="loading-state">Loading investigations…</div>
            ) : (
              <div className="table-wrapper">
                <table className="investigation-table">
                  <thead>
                    <tr>
                      <th>Transaction ID</th>
                      <th>Type</th>
                      <th>Amount</th>
                      <th>Fraud Probability</th>
                      <th>Risk</th>
                      <th>Review Status</th>
                      <th>Analyst Notes</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvestigations.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="empty-cell">
                          No flagged transactions to investigate.
                        </td>
                      </tr>
                    ) : (
                      filteredInvestigations.map((item) => (
                        <tr key={item.prediction_id}>
                          <td className="mono">{item.prediction_id}</td>
                          <td>{item.transaction_type}</td>
                          <td>{money(item.amount)}</td>
                          <td>{percent(item.fraud_probability)}</td>
                          <td>
                            <span className={`risk-badge ${riskClass(item.risk_level)}`}>
                              {item.risk_level}
                            </span>
                          </td>

                          {/* Update the review status in local state */}
                          <td>
                            <select
                              aria-label={`Review status for transaction ${item.prediction_id}`}
                              value={item.review_status || "PENDING"}
                              onChange={(e) =>
                                setInvestigations((current) =>
                                  current.map((investigation) =>
                                    investigation.prediction_id === item.prediction_id
                                      ? { ...investigation, review_status: e.target.value }
                                      : investigation
                                  )
                                )
                              }
                            >
                              <option value="PENDING">Pending</option>
                              <option value="UNDER_REVIEW">Under Review</option>
                              <option value="RESOLVED">Resolved</option>
                            </select>
                          </td>

                          {/* Edit analyst notes for this investigation */}
                          <td>
                            <textarea
                              rows="3"
                              aria-label={`Analyst notes for transaction ${item.prediction_id}`}
                              placeholder="Add investigation notes…"
                              value={investigationNotes[item.prediction_id] ?? item.analyst_notes ?? ""}
                              onChange={(e) =>
                                setInvestigationNotes((current) => ({
                                  ...current,
                                  [item.prediction_id]: e.target.value,
                                }))
                              }
                            />
                          </td>

                          {/* Save the status and notes to the backend */}
                          <td>
                            <button
                              className="primary-small"
                              onClick={() =>
                                saveInvestigation(
                                  item,
                                  item.review_status || "PENDING",
                                  investigationNotes[item.prediction_id] ?? item.analyst_notes ?? ""
                                )
                              }
                            >
                              Save changes
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ) : (
          /* Overview dashboard and transaction analyzer are in Part 4 */
          
          <>
            {/* Overview introduction */}
            <section className="welcome surface">
              <div>
                <p className="eyebrow">FRAUD MONITORING CENTER</p>
                <h2>See the risk. Stop the fraud.</h2>
                <p>
                  Analyze transaction inputs using your trained Random Forest
                  model and inspect the resulting risk estimate.
                </p>
              </div>
              <div className="welcome-symbol">⌁</div>
            </section>

            {/* Model and service status metrics */}
            <section className="status-metrics">
              <article className="status-metric">
                <div className="metric-icon violet">◈</div>
                <p>Machine Learning Model</p>
                <h3>Random Forest</h3>
                <span className="metric-footnote">Trained classifier</span>
              </article>

              <article className="status-metric">
                <div className="metric-icon amber">⌁</div>
                <p>Flag Threshold</p>
                <h3>94.34%</h3>
                <span className="metric-footnote">
                  Configured decision threshold
                </span>
              </article>

              <article className="status-metric">
                <div className="metric-icon green">⌁</div>
                <p>API Status</p>
                <h3 className={apiStatus === "healthy" ? "metric-online" : "metric-offline"}>
                  {apiStatus === "healthy" ? "Healthy" : apiStatus}
                </h3>
                <span className="metric-footnote">Prediction service</span>
              </article>

              <article className="status-metric">
                <div className="metric-icon blue">◉</div>
                <p>Model Status</p>
                <h3 className={modelStatus === "loaded" ? "metric-online" : "metric-offline"}>
                  {modelStatus === "loaded" ? "Loaded" : modelStatus}
                </h3>
                <span className="metric-footnote">Model availability</span>
              </article>
            </section>

            {/* Business metrics from saved predictions */}
            <section className="status-metrics business-metrics">
              <article className="status-metric">
                <p>Total Transactions</p>
                <h3>{totalTransactions}</h3>
                <span className="metric-footnote">Recorded predictions</span>
              </article>

              <article className="status-metric">
                <p>Flagged Transactions</p>
                <h3>{flaggedTransactions}</h3>
                <span className="metric-footnote">Flagged by model</span>
              </article>

              <article className="status-metric">
                <p>High-Risk Transactions</p>
                <h3>{highRiskTransactions}</h3>
                <span className="metric-footnote">Require close review</span>
              </article>

              <article className="status-metric">
                <p>Average Fraud Probability</p>
                <h3>{averageProbability}</h3>
                <span className="metric-footnote">
                  Across saved predictions
                </span>
              </article>
            </section>

            {/* Analytics charts and model information */}
            <section className="analytics-grid">
              <article className="surface chart-panel">
                <div className="panel-heading">
                  <div>
                    <h2>Fraud vs Other Predictions</h2>
                    <p>Recent saved predictions (up to 50)</p>
                  </div>
                </div>

                <div className="chart-area doughnut-area">
                  {historyLoading ? (
                    <p>Loading prediction data…</p>
                  ) : historyError ? (
                    <p>{historyError}</p>
                  ) : recentPredictions.length === 0 ? (
                    <p>No saved predictions available yet.</p>
                  ) : (
                    <Doughnut
                      data={doughnutData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: "bottom",
                            labels: {
                              color: theme === "dark" ? "#D9FBE2" : "#24352A",
                            },
                          },
                        },
                      }}
                    />
                  )}
                </div>
              </article>

              <article className="surface chart-panel">
                <div className="panel-heading">
                  <div>
                    <h2>Risk Distribution</h2>
                    <p>Risk labels in recent saved predictions</p>
                  </div>
                </div>

                <div className="chart-area">
                  <Bar data={riskChartData} options={chartOptions} />
                </div>
              </article>

              <article className="surface chart-panel">
                <div className="panel-heading">
                  <div>
                    <h2>Transaction Analytics</h2>
                    <p>Counts returned by the backend</p>
                  </div>
                </div>

                <div className="chart-area">
                  <Bar data={transactionChartData} options={chartOptions} />
                </div>
              </article>

              <article className="surface chart-panel">
                <div className="panel-heading">
                  <div>
                    <h2>Model Information</h2>
                    <p>Verified operational details</p>
                  </div>
                </div>

                <div className="model-info-list">
                  <div>
                    <span>Model type</span>
                    <strong>Random Forest</strong>
                  </div>

                  <div>
                    <span>Model status</span>
                    <strong>
                      {modelStatus === "loaded" ? "Loaded" : modelStatus}
                    </strong>
                  </div>

                  <div>
                    <span>Configured flag threshold</span>
                    <strong>94.34%</strong>
                  </div>

                  <p className="metric-footnote">
                    Accuracy, precision, recall and F1 are not shown because
                    verified evaluation metrics are not available from the
                    current API.
                  </p>
                </div>
              </article>
            </section>

            {/* Transaction analyzer section heading */}
            <div className="section-heading analyzer-heading">
              <div>
                <h2>Transaction risk analyzer</h2>
                <p>Enter transaction details for an AI risk estimate</p>
              </div>
              <span className="demo-badge">MODEL ANALYSIS</span>
            </div>

            <section className="content-grid">
              {/* Transaction input form */}
              <article className="panel surface">
                <div className="panel-heading">
                  <div>
                    <h2>Transaction details</h2>
                    <p>Fields used by the trained model</p>
                  </div>
                  <span className="panel-step">01 / INPUT</span>
                </div>

                <form className="transaction-form" onSubmit={analyzeTransaction}>
                  <label>
                    Transaction type
                    <select value={type} onChange={(e) => setType(e.target.value)}>
                      <option value="TRANSFER">TRANSFER</option>
                      <option value="CASH_OUT">CASH_OUT</option>
                      <option value="PAYMENT">PAYMENT</option>
                      <option value="CASH_IN">CASH_IN</option>
                      <option value="DEBIT">DEBIT</option>
                    </select>
                  </label>

                  <label>
                    Transaction amount
                    <input
                      type="number"
                      min="0.01"
                      step="any"
                      required
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </label>

                  <label>
                    Transaction step
                    <input
                      type="number"
                      min="1"
                      max="100000"
                      required
                      value={step}
                      onChange={(e) => setStep(e.target.value)}
                    />
                  </label>

                  <label>
                    Sender's previous balance
                    <input
                      type="number"
                      min="0"
                      step="any"
                      required
                      value={balance}
                      onChange={(e) => setBalance(e.target.value)}
                    />
                  </label>

                  <button className="analyze-button" disabled={loading}>
                    {loading ? (
                      <>
                        <span className="button-spinner" />
                        Analyzing transaction…
                      </>
                    ) : (
                      "Analyze transaction  →"
                    )}
                  </button>
                </form>

                {error && <div className="error-box">{error}</div>}
              </article>

              {/* Display the prediction API response */}
              <article className="panel surface result-panel">
                <div className="panel-heading">
                  <div>
                    <h2>Analysis result</h2>
                    <p>Live response from the prediction API</p>
                  </div>
                  <span className="panel-step">02 / RESULT</span>
                </div>

                {!result && !loading && !error && (
                  <div className="empty-state">
                    <div className="empty-icon">⌁</div>
                    <h3>Ready to analyze</h3>
                    <p>
                      Submit transaction details to see the estimated fraud
                      probability and risk category.
                    </p>
                  </div>
                )}

                {loading && (
                  <div className="empty-state">
                    <div className="button-spinner large-spinner" />
                    <h3>Analyzing transaction…</h3>
                    <p>Waiting for the trained model response.</p>
                  </div>
                )}

                {result && (
                  <div className="result-content">
                    <p className="eyebrow">ESTIMATED FRAUD PROBABILITY</p>

                    <div className="probability">
                      {Number(result.fraud_probability_percent).toFixed(2)}
                      <span>%</span>
                    </div>

                    <div className="probability-track">
                      <div
                        className={`probability-fill ${riskClass(result.risk_level)}`}
                        style={{
                          width: `${Math.min(
                            100,
                            Math.max(
                              0,
                              Number(result.fraud_probability_percent) || 0
                            )
                          )}%`,
                        }}
                      />
                    </div>

                    <div className="result-risk-line">
                      <span>Risk assessment</span>
                      <span className={`risk-badge ${riskClass(result.risk_level)}`}>
                        {result.risk_level}
                      </span>
                    </div>

                    <div className="result-row">
                      <span>Model decision</span>
                      <strong>{result.prediction}</strong>
                    </div>

                    <div className="result-row">
                      <span>Flag threshold</span>
                      <strong>{(Number(result.threshold) * 100).toFixed(2)}%</strong>
                    </div>

                    {result.disclaimer && (
                      <p className="result-disclaimer">{result.disclaimer}</p>
                    )}
                  </div>
                )}
              </article>
            </section>

            {/* Application footer */}
            <footer className="app-footer">
              <span>
                FraudSentinel AI <span className="footer-dot">•</span>{" "}
                Financial Fraud Detection
              </span>
              <span>Development build · v1.0.0</span>
            </footer>
          </>

        
        )}
      </main>
    </div>
  );
}

export default App;


