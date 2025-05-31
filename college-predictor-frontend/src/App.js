// college-predictor-frontend/src/App.js

import React, { useState, useEffect, useRef } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { BRANCH_MAP } from "./branchMap";

function App() {
  const [rank, setRank] = useState("");
  const [category, setCategory] = useState("");
  const [branch, setBranch] = useState("");
  const [categories, setCategories] = useState([]);
  const [branches, setBranches] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const tableRef = useRef(null);

  useEffect(() => {
    // Fetch categories
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

    // Fetch branches
    fetch("/branches")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load branches");
        return res.json();
      })
      .then((data) => {
        setBranches(data);
        setBranch("");
      })
      .catch((err) => {
        console.error(err);
        setError("Unable to load branch list");
      });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setResults([]);
    setLoading(true);

    const numericRank = parseInt(rank, 10);
    if (isNaN(numericRank) || numericRank <= 0) {
      setError("Please enter a valid positive integer rank.");
      setLoading(false);
      return;
    }
    if (!category) {
      setError("Please select a category.");
      setLoading(false);
      return;
    }

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

  // ──────────────────────────────────────────────────────────────────────────
  // Download the results DIV as a PDF
  // ──────────────────────────────────────────────────────────────────────────
  const handleDownloadPdf = async () => {
    if (!tableRef.current) return;
    // 1) Render the table area to a high‐res canvas
    const canvas = await html2canvas(tableRef.current, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");

    // 2) Create a PDF instance (we imported `jsPDF` above)
    const pdf = new jsPDF("p", "pt", "a4");
    pdf.setFontSize(18);
    pdf.text("Eligible Colleges", 40, 30);

    // 3) Compute width/height to fit A4
    const pageWidth = pdf.internal.pageSize.getWidth();
    const imgWidth = pageWidth - 80;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    // 4) Add image and save
    pdf.addImage(imgData, "PNG", 40, 50, imgWidth, imgHeight);
    pdf.save("Eligible_Colleges.pdf");
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center py-10 px-4">
      <h1 className="text-4xl font-bold mb-8">CET College Predictor</h1>

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
              <option value="">-- None (all branches) --</option>
              {branches.map((code) => (
                <option key={code} value={code}>
                  {`${code} ${BRANCH_MAP[code] || ""}`}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 text-white font-medium py-2 rounded hover:bg-blue-600 transition disabled:opacity-50"
          >
            {loading ? "Searching..." : "Find Colleges"}
          </button>
        </form>
      </div>

      {results.length > 0 && (
        <div className="w-full max-w-4xl bg-white shadow-md rounded-lg p-6 mb-8">
          {/* Download PDF */}
          <div className="flex justify-end mb-4">
            <button
              onClick={handleDownloadPdf}
              className="bg-green-500 text-white px-6 py-2 rounded hover:bg-green-600 transition"
            >
              Download as PDF
            </button>
          </div>

          {/* Table */}
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
                    <>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Branch
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cutoff Rank
                      </th>
                    </>
                  ) : (
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
                      <>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {`${item.branch} ${BRANCH_MAP[item.branch] || ""}`}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {item.cutoff_rank}
                        </td>
                      </>
                    ) : (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        <ul className="list-disc pl-5 space-y-1">
                          {item.branches.map((b, bi) => (
                            <li key={bi}>
                              {`${b.branch} ${BRANCH_MAP[b.branch] || ""} (Cutoff: ${b.cutoff_rank})`}
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

