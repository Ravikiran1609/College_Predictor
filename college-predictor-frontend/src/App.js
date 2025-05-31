import React, { useState, useEffect } from "react";
import "./App.css"; // if you want any basic styling; otherwise you can remove this import

function App() {
  // ────────────────────────────────────────────────────────────────────────────
  // 1) Component state
  const [categories, setCategories] = useState([]);      // list of category codes
  const [branches, setBranches] = useState([]);          // list of branch codes
  const [errorCategories, setErrorCategories] = useState(false);
  const [errorBranches, setErrorBranches] = useState(false);

  const [rank, setRank] = useState("");                  // user‐entered CET rank
  const [category, setCategory] = useState("");          // selected category
  const [branch, setBranch] = useState("");              // selected branch (optional)

  const [results, setResults] = useState([]);            // array of objects returned from /predict
  const [errorPredict, setErrorPredict] = useState(false);

  // ────────────────────────────────────────────────────────────────────────────
  // 2) Base URL of backend:
  //    If you run FastAPI on port 8000, use this base. Adjust if needed.
  const BACKEND_URL = "http://localhost:8000";

  // ────────────────────────────────────────────────────────────────────────────
  // 3) On mount, fetch categories and branches
  useEffect(() => {
    // Fetch categories
    fetch(`${BACKEND_URL}/categories`)
      .then((resp) => {
        if (!resp.ok) throw new Error("Failed to load categories");
        return resp.json();
      })
      .then((data) => {
        setCategories(data);
        // default‐select first category if available
        if (data.length > 0) setCategory(data[0]);
      })
      .catch((_) => {
        setErrorCategories(true);
      });

    // Fetch branches
    fetch(`${BACKEND_URL}/branches`)
      .then((resp) => {
        if (!resp.ok) throw new Error("Failed to load branches");
        return resp.json();
      })
      .then((data) => {
        // Prepend an “Any Branch” option (empty string)
        setBranches(data);
      })
      .catch((_) => {
        setErrorBranches(true);
      });
  }, []);

  // ────────────────────────────────────────────────────────────────────────────
  // 4) When “Search” is clicked:
  const handleSearch = () => {
    setErrorPredict(false);
    setResults([]); // clear any old results

    // Input validation
    const parsedRank = parseInt(rank, 10);
    if (isNaN(parsedRank) || parsedRank < 1) {
      alert("Please enter a valid positive integer for CET Rank.");
      return;
    }
    if (!category) {
      alert("Please select a Category.");
      return;
    }

    // Build query parameters
    const params = new URLSearchParams({ rank: parsedRank.toString(), category });
    if (branch) {
      params.append("branch", branch);
    }

    fetch(`${BACKEND_URL}/predict?${params.toString()}`)
      .then((resp) => {
        if (!resp.ok) throw new Error("Predict failed");
        return resp.json();
      })
      .then((data) => {
        setResults(data);
      })
      .catch((_) => {
        setErrorPredict(true);
      });
  };

  // ────────────────────────────────────────────────────────────────────────────
  // 5) Render
  return (
    <div style={{ padding: "1rem", maxWidth: 800, margin: "0 auto" }}>
      <h1>College Cutoff Predictor</h1>

      {/* Error box if branches or categories did not load */}
      {errorCategories && (
        <div style={{
            background: "#f8d7da", 
            color: "#721c24", 
            padding: "0.75rem", 
            borderRadius: 4,
            border: "1px solid #f5c6cb",
            marginBottom: "1rem"
          }}
        >
          Could not load categories from backend.
        </div>
      )}
      {errorBranches && (
        <div style={{
            background: "#f8d7da", 
            color: "#721c24", 
            padding: "0.75rem", 
            borderRadius: 4,
            border: "1px solid #f5c6cb",
            marginBottom: "1rem"
          }}
        >
          Could not load branches from backend.
        </div>
      )}

      <div style={{ marginBottom: "1rem" }}>
        <label style={{ display: "block", marginBottom: 4 }}>
          Your CET Rank:
        </label>
        <input
          type="number"
          min="1"
          value={rank}
          onChange={e => setRank(e.target.value)}
          style={{ padding: "0.5rem", width: "100%" }}
          placeholder="Enter your CET rank (e.g. 12000)"
        />
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <label style={{ display: "block", marginBottom: 4 }}>
          Category:
        </label>
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          style={{ padding: "0.5rem", width: "100%" }}
          disabled={errorCategories || categories.length === 0}
        >
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <label style={{ display: "block", marginBottom: 4 }}>
          Branch (optional):
        </label>
        <select
          value={branch}
          onChange={e => setBranch(e.target.value)}
          style={{ padding: "0.5rem", width: "100%" }}
          disabled={errorBranches || branches.length === 0}
        >
          <option value="">— Any Branch —</option>
          {branches.map((br) => (
            <option key={br} value={br}>
              {br}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={handleSearch}
        style={{
          padding: "0.75rem 1.5rem",
          fontSize: "1rem",
          cursor: "pointer",
          marginBottom: "1rem"
        }}
      >
        Search
      </button>

      {/* If predict call failed */}
      {errorPredict && (
        <div style={{
            background: "#f8d7da", 
            color: "#721c24", 
            padding: "0.75rem", 
            borderRadius: 4,
            border: "1px solid #f5c6cb",
            marginBottom: "1rem"
          }}
        >
          Could not fetch predictions. Please try again.
        </div>
      )}

      {/* Results table */}
      {results.length > 0 ? (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f2f2f2" }}>
              <th style={{ padding: "0.5rem", border: "1px solid #ccc" }}>Code</th>
              <th style={{ padding: "0.5rem", border: "1px solid #ccc" }}>College Name</th>
              <th style={{ padding: "0.5rem", border: "1px solid #ccc" }}>Branch</th>
              <th style={{ padding: "0.5rem", border: "1px solid #ccc" }}>Cutoff Rank</th>
            </tr>
          </thead>
          <tbody>
            {results.map((row) => (
              <tr key={`${row.college_code}-${row.branch_code}`} >
                <td style={{ padding: "0.5rem", border: "1px solid #ccc" }}>
                  {row.college_code}
                </td>
                <td style={{ padding: "0.5rem", border: "1px solid #ccc" }}>
                  {row.college_name}
                </td>
                <td style={{ padding: "0.5rem", border: "1px solid #ccc" }}>
                  {row.branch_code}
                </td>
                <td style={{ padding: "0.5rem", border: "1px solid #ccc" }}>
                  {row.cutoff_rank}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        // If no results *and* no error, show "No results to display."
        !errorPredict && (
          <p style={{ marginTop: "1rem", fontStyle: "italic" }}>
            No results to display.
          </p>
        )
      )}
    </div>
  );
}

export default App;

