// ─────────────────────────────────────────────────────────────────────────────
// App.js
//
// Assumes your React app is served (for example) at http://localhost (port 80 or 3000),
// and your FastAPI backend is running on http://localhost:8000.
//
// It always does fetch("http://localhost:8000/...") explicitly.
//
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useState } from "react";

function App() {
  // Backend base URL (adjust if your backend is on a different host/IP)
  const BACKEND_BASE = "http://localhost:8000";

  // State for dropdowns and form
  const [branches, setBranches] = useState([]);
  const [categories, setCategories] = useState([]);
  const [rank, setRank] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [results, setResults] = useState([]);
  const [errorMsg, setErrorMsg] = useState("");

  // On component mount, fetch categories and branches from http://localhost:8000
  useEffect(() => {
    // 1) Fetch categories
    fetch(`${BACKEND_BASE}/categories`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status} fetching ${BACKEND_BASE}/categories`);
        }
        return res.json();
      })
      .then((data) => {
        setCategories(data);
        if (data.length > 0) {
          setSelectedCategory(data[0]);
        }
      })
      .catch((err) => {
        console.error("Failed to load categories:", err);
        setErrorMsg("Could not load categories from backend.");
      });

    // 2) Fetch branches
    fetch(`${BACKEND_BASE}/branches`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status} fetching ${BACKEND_BASE}/branches`);
        }
        return res.json();
      })
      .then((data) => {
        setBranches(data);
      })
      .catch((err) => {
        console.error("Failed to load branches:", err);
        setErrorMsg("Could not load branches from backend.");
      });
  }, []);

  const handleSearch = () => {
    setErrorMsg("");
    setResults([]);

    // Validate rank
    if (!rank || isNaN(Number(rank))) {
      setErrorMsg("Please enter a valid numeric rank.");
      return;
    }

    if (!selectedCategory) {
      setErrorMsg("Please select a category.");
      return;
    }

    // Build the full URL to /predict
    let url = `${BACKEND_BASE}/predict?rank=${encodeURIComponent(rank)}&category=${encodeURIComponent(
      selectedCategory
    )}`;
    if (selectedBranch) {
      url += `&branch=${encodeURIComponent(selectedBranch)}`;
    }

    fetch(url)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status} fetching ${url}`);
        }
        return res.json();
      })
      .then((data) => {
        setResults(data);
      })
      .catch((err) => {
        console.error("Error fetching predict:", err);
        setErrorMsg("Search failed. Please verify backend is running.");
      });
  };

  return (
    <div style={{ padding: "1rem", fontFamily: "Arial, sans-serif" }}>
      <h1>College Cutoff Predictor</h1>

      {errorMsg && (
        <div
          style={{
            marginBottom: "1rem",
            padding: "0.5rem",
            backgroundColor: "#ffe6e6",
            border: "1px solid #ff9999",
            color: "#990000",
          }}
        >
          {errorMsg}
        </div>
      )}

      <div style={{ marginBottom: "1rem" }}>
        <label style={{ marginRight: "0.5rem" }}>
          Your CET Rank:
          <input
            type="number"
            value={rank}
            onChange={(e) => setRank(e.target.value)}
            style={{ marginLeft: "0.5rem", width: "100px" }}
          />
        </label>
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <label style={{ marginRight: "0.5rem" }}>
          Category:
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{ marginLeft: "0.5rem" }}
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <label style={{ marginRight: "0.5rem" }}>
          Branch (optional):
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            style={{ marginLeft: "0.5rem" }}
          >
            <option value="">— Any Branch —</option>
            {branches.map((br) => (
              <option key={br} value={br}>
                {br}
              </option>
            ))}
          </select>
        </label>
      </div>

      <button onClick={handleSearch} style={{ padding: "0.5rem 1rem" }}>
        Search
      </button>

      <hr style={{ margin: "1.5rem 0" }} />

      {results.length > 0 ? (
        <table
          style={{
            borderCollapse: "collapse",
            width: "100%",
            maxWidth: "800px",
          }}
        >
          <thead>
            <tr>
              <th style={{ border: "1px solid #ccc", padding: "0.5rem" }}>
                College Code
              </th>
              <th style={{ border: "1px solid #ccc", padding: "0.5rem" }}>
                College Name
              </th>
              <th style={{ border: "1px solid #ccc", padding: "0.5rem" }}>
                Branch
              </th>
              <th style={{ border: "1px solid #ccc", padding: "0.5rem" }}>
                Cutoff Rank
              </th>
            </tr>
          </thead>
          <tbody>
            {results.map((row, idx) => (
              <tr key={idx}>
                <td style={{ border: "1px solid #ddd", padding: "0.5rem" }}>
                  {row.college_code}
                </td>
                <td style={{ border: "1px solid #ddd", padding: "0.5rem" }}>
                  {row.college_name}
                </td>
                <td style={{ border: "1px solid #ddd", padding: "0.5rem" }}>
                  {row.branch_code}
                </td>
                <td style={{ border: "1px solid #ddd", padding: "0.5rem" }}>
                  {row.cutoff_rank}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>No results to display.</p>
      )}
    </div>
  );
}

export default App;

