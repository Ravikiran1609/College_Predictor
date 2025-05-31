import React, { useState } from 'react';

function App() {
  const [rank, setRank] = useState('');
  const [category, setCategory] = useState('GM');
  const [branch, setBranch] = useState('CS');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResults([]);
    try {
      const response = await fetch(
        `/predict?rank=${encodeURIComponent(rank)}&category=${encodeURIComponent(category)}&branch=${encodeURIComponent(branch)}`
      );
      if (!response.ok) {
        throw new Error('Error fetching results');
      }
      const data = await response.json();
      setResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center py-10 px-4">
      <h1 className="text-4xl font-bold mb-6">CET College Predictor</h1>
      <form onSubmit={handleSubmit} className="w-full max-w-md bg-white p-6 rounded-lg shadow">
        <div className="mb-4">
          <label className="block text-gray-700 mb-2" htmlFor="rank">
            Your CET Rank
          </label>
          <input
            type="number"
            id="rank"
            value={rank}
            onChange={(e) => setRank(e.target.value)}
            className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 mb-2" htmlFor="category">
            Category
          </label>
          <input
            type="text"
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
            placeholder="e.g. GM, SCG, 2AG"
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 mb-2" htmlFor="branch">
            Branch
          </label>
          <input
            type="text"
            id="branch"
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
            placeholder="e.g. CS, EC, ME"
          />
        </div>
        <button
          type="submit"
          className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 transition"
          disabled={!rank || !category || !branch || loading}
        >
          {loading ? 'Searching...' : 'Find Colleges'}
        </button>

        {error && <p className="text-red-500 mt-4">{error}</p>}
      </form>

      {results.length > 0 && (
        <div className="w-full max-w-4xl mt-10">
          <h2 className="text-2xl font-semibold mb-4">Eligible Colleges</h2>
          <table className="w-full bg-white rounded-lg shadow overflow-hidden">
            <thead className="bg-blue-500 text-white">
              <tr>
                <th className="py-2 px-4 text-left">College Code</th>
                <th className="py-2 px-4 text-left">College Name</th>
                <th className="py-2 px-4 text-left">Branch</th>
                <th className="py-2 px-4 text-left">Category</th>      
                <th className="py-2 px-4 text-left">Cutoff Rank</th>
              </tr>
            </thead>
            <tbody>
              {results.map((item, index) => (
                <tr
                  key={index}
                  className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}
                >
                  <td className="py-2 px-4">{item.college_code}</td>
                  <td className="py-2 px-4">{item.college_full_name}</td>
                  <td className="py-2 px-4">{item.branch}</td>
                  <td className="py-2 px-4">{item.category}</td>
                  <td className="py-2 px-4">{item.cutoff_rank}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {results.length === 0 && !loading && (
        <p className="mt-10 text-gray-600">Enter details and click &quot;Find Colleges&quot; to see results.</p>
      )}
    </div>
  );
}

export default App;
