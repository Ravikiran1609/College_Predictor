// college-predictor-frontend/src/App.js

import React, { useState, useEffect, useRef } from "react";
import html2canvas from "html2canvas";     // ← Add this line
import jsPDF from "jspdf";
import "jspdf-autotable";
import { BRANCH_MAP } from "./branchMap";

function App() {
  // ─────────────────────────────────────────────────────────────────────────────
  // State variables
  // ─────────────────────────────────────────────────────────────────────────────
  const [rank, setRank] = useState("");
  const [category, setCategory] = useState("");
  const [branch, setBranch] = useState("");       // "" means “all branches”
  const [categories, setCategories] = useState([]);
  const [branches, setBranches] = useState([]);   // list of codes (["AI","CS",…])
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Reference to the table container (for PDF snapshot)
  const tableRef = useRef(null);

  // ─────────────────────────────────────────────────────────────────────────────
  // On mount: fetch categories + branches
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    // 1) Load categories
    fetch("/categories")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load categories");
        return res.json();
      })
      .then((data) => {
        setCategories(data);
        if (data.length > 0) setCategory(data[0]);
      })
      .catch((err) => {
        console.error(err);
        setError("Unable to load category list");
      });

    // 2) Load branches (just codes)
    fetch("/branches")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load branches");
        return res.json();
      })
      .then((data) => {
        // Data comes back as ["AI Artificial Intelligence", "AR Architecture", …]
        // We only want the code (before the first space).
        const codes = data.map((b) => b.split(" ")[0]);
        setBranches(codes);
        if (codes.length > 0) setBranch(""); // default to “all branches”
      })
      .catch((err) => {
        console.error(err);
        setError("Unable to load branch list");
      });
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // Handle form submission
  // ─────────────────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setResults([]);
    setLoading(true);

    const numericRank = parseInt(rank, 10);
    if (isNaN(numericRank) || numericRank <= 0) {
      setError("Please enter a valid rank (a positive integer).");
      setLoading(false);
      return;
    }
    if (!category) {
      setError("Please select a category.");
      setLoading(false);
      return;
    }

    // Build query URL
    let url = `/predict?rank=${numericRank}&category=${encodeURIComponent(category)}`;
    if (branch) {
      url += `&branch=${encodeURIComponent(branch)}`;
    }

    try {
      const resp = await fetch(url);
      if (!resp.ok) {
        const errJson = await resp.json();
        throw new Error(errJson.detail || resp.statusText);
      }
      const data = await resp.json();
      setResults(data);
    } catch (err) {
      console.error("Fetch error:", err);
      setError(`Error fetching results: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Generate PDF
  // ─────────────────────────────────────────────────────────────────────────────
  const handleDownloadPdf = async () => {
    if (!tableRef.current) return;

    // 1) Use html2canvas to render the table to a canvas
    const canvas = await html2canvas(tableRef.current, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");

    // 2) Create jsPDF
    const { jsPDF: JsPDF } = window.jspdf;
    const pdf = new JsPDF("p", "pt", "a4");

    // Title
    pdf.setFontSize(18);
    pdf.text("Eligible Colleges", 40, 30);

    // Calculate dimensions
    const pageWidth = pdf.internal.pageSize.getWidth();
    const imgWidth = pageWidth - 80; // 40pt margin on each side
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    pdf.addImage(imgData, "PNG", 40, 50, imgWidth, imgHeight);
    pdf.save("Eligible_Colleges.pdf");
  };

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center py-10 px-4">
      <h1 className="text-4xl font-bold mb-8">CET College Predictor</h1>

      {/* Error Message */}
      {error && (
        <div className="mb-4 w-full max-w-md bg-red-100 text-red-700 p-3 rounded">
          {error}
        </div>
      )}

      {/* Input Form */}
      <div className="w-full max-w-md bg-white shadow-md rounded-lg p-6 mb-8">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Rank */}
          <div>
            <label
              htmlFor="rank-input"
              className="block text-gray-700 font-medium mb-1"
            >
              Your CET Rank
            </label>
            <input
              type="number"
              id="rank-input"
              value={rank}
              onChange={(e) => setRank(e.target.value)}
              placeholder="e.g. 19024"
              className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
              required
              min="1"
            />
          </div>

          {/* Category */}
          <div>
            <label
              htmlFor="category-select"
              className="block text-gray-700 font-medium mb-1"
            >
              Category
            </label>
            <select
              id="category-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
              required
            >
              <option value="" disabled>
                Select category…
              </option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Branch (optional) */}
          <div>
            <label
              htmlFor="branch-select"
              className="block text-gray-700 font-medium mb-1"
            >
              Branch (optional)
            </label>
            <select
              id="branch-select"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="">
                -- None (show all eligible branches) --
              </option>
              {branches.map((code) => (
                <option key={code} value={code}>
                  {`${code} ${BRANCH_MAP[code] || ""}`}
                </option>
              ))}
            </select>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 text-white font-medium py-2 rounded hover:bg-blue-600 transition disabled:opacity-50"
          >
            {loading ? "Searching..." : "Find Colleges"}
          </button>
        </form>
      </div>

      {/* Results Section */}
      {results.length > 0 && (
        <div className="w-full max-w-4xl bg-white shadow-md rounded-lg p-6 mb-8">
          {/* Download PDF Button */}
          <div className="flex justify-end mb-4">
            <button
              onClick={handleDownloadPdf}
              className="bg-green-500 text-white px-6 py-2 rounded hover:bg-green-600 transition"
            >
              Download as PDF
            </button>
          </div>

          {/* Table of Results */}
          <div ref={tableRef}>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    College Name
                  </th>

                  {branch ? (
                    // Single‐branch mode
                    <>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Branch
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cutoff Rank
                      </th>
                    </>
                  ) : (
                    // Multi‐branch mode
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Eligible Branches (Code + Full Name + Cutoff)
                    </th>
                  )}
                </tr>
              </thead>

              <tbody className="bg-white divide-y divide-gray-200">
                {results.map((item, idx) => (
                  <tr
                    key={idx}
                    className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {item.code}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {item.college_name}
                    </td>

                    {branch ? (
                      // Single‐branch: we expect item = {code, college_name, branch, branch_full, cutoff_rank}
                      <>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {`${item.branch} ${item.branch_full}`}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {item.cutoff_rank}
                        </td>
                      </>
                    ) : (
                      // Multi‐branch: we expect item = {code, college_name, branches:[{branch,branch_full,cutoff_rank}, ...]}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        <ul className="list-disc pl-5 space-y-1">
                          {item.branches.map((b, bi) => (
                            <li key={bi}>
                              {`${b.branch} ${b.branch_full} (Cutoff: ${b.cutoff_rank})`}
                            </li>
                          ))}
                        </ul>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* If no results (and not loading), prompt user */}
      {!loading && results.length === 0 && !error && (
        <p className="mt-8 text-gray-600">
          Enter your rank, select a category, (optionally pick a branch), then
          click “Find Colleges” to see results.
        </p>
      )}
    </div>
  );
}

export default App;

