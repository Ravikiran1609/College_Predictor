import React, { useEffect, useState } from 'react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable'; // Make sure you installed both jsPDF and jspdf-autotable in package.json as dependencies

function App() {
  const [categories, setCategories] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('engineering');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [rank, setRank] = useState('');
  const [results, setResults] = useState([]);

  // Load categories on mount
  useEffect(() => {
    fetch('/categories')
      .then((resp) => {
        if (!resp.ok) throw new Error('Failed to load categories');
        return resp.json();
      })
      .then(data => setCategories(data))
      .catch(err => console.error(err));
  }, []);

  // Load branches once course & category are selected
  useEffect(() => {
    if (!selectedCourse || !selectedCategory) {
      setBranches([]);
      return;
    }

    // e.g. GET /branches?course=engineering&category=GM
    fetch(`/branches?course=${selectedCourse}&category=${selectedCategory}`)
      .then((resp) => {
        if (!resp.ok) throw new Error('Failed to load branches');
        return resp.json();
      })
      .then(data => setBranches(data))
      .catch(err => console.error(err));
  }, [selectedCourse, selectedCategory]);

  const onSubmit = () => {
    if (!rank || !selectedCourse || !selectedCategory) {
      alert('Rank, Course, and Category are required.');
      return;
    }

    let url = `/predict?rank=${rank}&category=${selectedCategory}&course=${selectedCourse}`;
    if (selectedBranch) {
      url += `&branch=${encodeURIComponent(selectedBranch)}`;
    }

    fetch(url)
      .then((resp) => {
        if (!resp.ok) throw new Error('Failed to fetch results');
        return resp.json();
      })
      .then(data => setResults(data.eligible || []))
      .catch(err => {
        console.error(err);
        alert('Error fetching results');
      });
  };

  // Download table as PDF using jsPDF + autotable
  const downloadPDF = () => {
    if (results.length === 0) {
      alert('No results to download.');
      return;
    }

    const doc = new jsPDF();
    const tableColumn = ['Code', 'College Name', 'Branch', 'Cutoff Rank'];
    const tableRows = [];

    results.forEach(item => {
      tableRows.push([
        item.Code,
        item['College Name'],
        item.Branch,
        item['Cutoff Rank']
      ]);
    });

    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 20,
    });

    doc.save(`eligible_colleges_${selectedCourse}_${selectedCategory}.pdf`);
  };

  return (
    <div style={{ maxWidth: 800, margin: 'auto', padding: 30, fontFamily: 'Arial, sans-serif' }}>
      <h1>College Predictor</h1>

      <div style={{ marginBottom: 20 }}>
        <label>
          Course:&nbsp;
          <select
            value={selectedCourse}
            onChange={(e) => { setSelectedCourse(e.target.value); setSelectedCategory(''); setSelectedBranch(''); }}
          >
            <option value="engineering">Engineering</option>
            <option value="pharma">Pharmacy</option>
            <option value="bscnurs">BSc Nursing</option>
            <option value="agri">Agriculture</option>
          </select>
        </label>
      </div>

      <div style={{ marginBottom: 20 }}>
        <label>
          Category:&nbsp;
          <select
            value={selectedCategory}
            onChange={(e) => { setSelectedCategory(e.target.value); setSelectedBranch(''); }}
          >
            <option value="">-- Select Category --</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </label>
      </div>

      <div style={{ marginBottom: 20 }}>
        <label>
          Branch (optional):&nbsp;
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            disabled={branches.length === 0}
          >
            <option value="">-- All Branches --</option>
            {branches.map((br) => (
              <option key={br} value={br}>{br}</option>
            ))}
          </select>
        </label>
      </div>

      <div style={{ marginBottom: 20 }}>
        <label>
          CET Rank:&nbsp;
          <input
            type="number"
            value={rank}
            onChange={(e) => setRank(e.target.value)}
            placeholder="Enter your CET rank"
          />
        </label>
      </div>

      <button onClick={onSubmit} style={{ padding: '8px 16px', cursor: 'pointer' }}>
        Predict
      </button>

      {results.length > 0 && (
        <div style={{ marginTop: 40 }}>
          <h2>Eligible Colleges</h2>
          <table border="1" cellPadding="8" cellSpacing="0" width="100%" style={{ borderCollapse: 'collapse' }}>
            <thead style={{ backgroundColor: '#f0f0f0' }}>
              <tr>
                <th>Code</th>
                <th>College Name</th>
                <th>Branch</th>
                <th>Cutoff Rank</th>
              </tr>
            </thead>
            <tbody>
              {results.map((item, idx) => (
                <tr key={idx}>
                  <td>{item.Code}</td>
                  <td>{item['College Name']}</td>
                  <td>{item.Branch}</td>
                  <td>{item['Cutoff Rank']}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <button
            onClick={downloadPDF}
            style={{ marginTop: 20, padding: '6px 12px', cursor: 'pointer' }}
          >
            Download as PDF
          </button>
        </div>
      )}
    </div>
  );
}

export default App;

