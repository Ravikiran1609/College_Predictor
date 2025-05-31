import React, { useState, useEffect } from "react";

function App() {
  // Form fields
  const [rank, setRank] = useState("");
  const [category, setCategory] = useState("");
  const [branch, setBranch] = useState("");

  // Dropdown options (fetched from backend)
  const [categories, setCategories] = useState([]);
  const [branches, setBranches] = useState([]);

  // Results from /predict
  const [results, setResults] = useState([]);

  // Loading / error states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Fetch lists of categories and branches on component mount
  useEffect(() => {
    // 1. Fetch categories
    fetch("/categories")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch categories");
        return res.json();
      })
      .then((data) => {
        setCategories(data); // e.g. ["1G", "1K", "2AG", …]
        if (data.length > 0) {
          setCategory(data[0]); // default to first option
        }
      })
      .catch((err) => {
        console.error("Error fetching categories:", err);
        setError("Unable to load category list");
      });

    // 2. Fetch branches
    fetch("/branches")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch branches");
        return res.json();
      })
      .then((data) => {
        setBranches(data); // e.g. ["AE", "AI", "AR", "BT", "CA", …]
        if (data.length > 0) {
          setBranch(data[0]); // default to first option
        }
      })
      .catch((err) => {
        console.error("Error fetching branches:", err);
        setError("Unable to load branch list");
      });
  }, []);

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResults([]);

    // Make sure rank is an integer
    const numericRank = parseInt(rank, 10);
    if (isNaN(numericRank)) {
      setError("Rank must be a number");
      setLoading(false);
      return;
    }

    try {
      const url = `/predict?rank=${numericRank}&category=${encodeURIComponent(
        category
      )}&branch=${encodeURIComponent(branch)}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }
      const data = await response.json();
      setResults(data);
    } catch (err) {
      console.error("Fetch error:", err);
      setError("Error fetching results");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center py-10 px-4">
      <h1 className="text-4xl font-bold mb-8">CET College Predictor</h1>

      {/* Error / Info */}
      {error && (
        <div className="mb-4 w-full max-w-md bg-red-100 text-red-700 p-3 rounded">
          {error}
        </div>
      )}

      {/* Form Card */}
      <div className="w-full max-w-md bg-white shadow-md rounded-lg p-6 mb-10">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Rank Input */}
          <div>
            <label
              htmlFor="rank"
              className="block text-gray-700 font-medium mb-1"
            >
              Your CET Rank
            </label>
            <input
              type="number"
              id="rank"
              value={rank}
              onChange={(e) => setRank(e.target.value)}
              placeholder="e.g. 19024"
              className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
              required
            />
          </div>

          {/* Category Dropdown */}
          <div>
            <label
              htmlFor="category"
              className="block text-gray-700 font-medium mb-1"
            >
              Category
            </label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
              required
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Branch Dropdown */}
          <div>
            <label
              htmlFor="branch"
              className="block text-gray-700 font-medium mb-1"
            >
              Branch
            </label>
            <select
              id="branch"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
              required
            >
              {branches.map((br) => (
                <option key={br} value={br}>
                  {br}
                </option>
              ))}
            </select>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!rank || loading}
            className="w-full bg-blue-500 text-white font-medium py-2 rounded hover:bg-blue-600 transition disabled:opacity-50"
          >
            {loading ? "Searching..." : "Find Colleges"}
          </button>
        </form>
      </div>

      {/* Results Table */}
      {results.length > 0 && (
        <div className="w-full max-w-4xl bg-white shadow-md rounded-lg overflow-x-auto">
          <h2 className="text-2xl font-semibold px-6 py-4 border-b">Eligible Colleges</h2>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  College Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Branch
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cutoff Rank
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {results.map((item, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {item.college_code}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {item.college_full_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {item.branch}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {item.category}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {item.cutoff_rank}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* If there are no results and not loading, show a friendly message */}
      {!loading && results.length === 0 && (
        <p className="mt-8 text-gray-600">
          Enter your rank, select a category & branch, then click “Find Colleges” to see results.
        </p>
      )}
    </div>
  );
}

export default App;

