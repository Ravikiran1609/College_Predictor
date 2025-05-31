import React, { useEffect, useState, useRef } from "react";
import "./App.css";

// We will dynamically import jsPDF and html2canvas via a <script> tag in index.html
// so we can just use window.jspdf.jsPDF and window.html2canvas.

function App() {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [categories, setCategories] = useState([]);
  const [branches, setBranches] = useState([]);
  const [rank, setRank] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [results, setResults] = useState([]);

  const tableRef = useRef();

  // Base URL of backend (adjust if needed; here we assume same host on port 8000)
  const BASE_URL = "http://localhost:8000";

  // 1) On mount, fetch courses
  useEffect(() => {
    fetch(`${BASE_URL}/courses`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load courses");
        return res.json();
      })
      .then((data) => {
        setCourses(data);
        if (data.length > 0) {
          setSelectedCourse(data[0]);
        }
      })
      .catch((err) => {
        console.error(err);
      });
  }, []);

  // 2) When selectedCourse changes, fetch categories + branches for that course
  useEffect(() => {
    if (!selectedCourse) return;

    // Fetch categories
    fetch(`${BASE_URL}/categories?course=${encodeURIComponent(selectedCourse)}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load categories");
        return res.json();
      })
      .then((data) => {
        setCategories(data);
        if (data.length > 0) {
          setSelectedCategory(data[0]);
        }
      })
      .catch((err) => {
        console.error(err);
        setCategories([]);
        setSelectedCategory("");
      });

    // Fetch branches
    fetch(`${BASE_URL}/branches?course=${encodeURIComponent(selectedCourse)}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load branches");
        return res.json();
      })
      .then((data) => {
        setBranches(data);
        // We will keep "selectedBranch" optional; initialize it to empty or first value
        setSelectedBranch("");
      })
      .catch((err) => {
        console.error(err);
        setBranches([]);
        setSelectedBranch("");
      });
  }, [selectedCourse]);

  // 3) “Find Colleges” button handler
  const onFindColleges = () => {
    if (!selectedCourse || !selectedCategory || !rank) {
      alert("Please select course, category, and enter your rank.");
      return;
    }
    const queryParams = new URLSearchParams({
      course: selectedCourse,
      rank,
      category: selectedCategory,
    });
    if (selectedBranch) {
      queryParams.set("branch", selectedBranch);
    }
    fetch(`${BASE_URL}/predict?${queryParams.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load results");
        return res.json();
      })
      .then((data) => {
        setResults(data);
      })
      .catch((err) => {
        console.error(err);
        setResults([]);
      });
  };

  // 4) “Download as PDF” handler
  const onDownloadPDF = async () => {
    if (!window.jspdf || !window.jspdf.jsPDF || !window.html2canvas) {
      alert("PDF libraries not loaded.");
      return;
    }
    const { jsPDF } = window.jspdf;
    const element = tableRef.current;
    const canvas = await window.html2canvas(element, {
      scale: 2,
      useCORS: true,
    });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "pt",
      format: "a4",
    });
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight =
      (canvas.height * pdfWidth) / canvas.width;
    pdf.text(`CET College Predictor Results`, 40, 40);
    pdf.text(`Course: ${selectedCourse}`, 40, 60);
    pdf.text(`Category: ${selectedCategory}`, 40, 80);
    if (selectedBranch) {
      pdf.text(`Branch: ${selectedBranch}`, 40, 100);
    }
    pdf.text(`Rank: ${rank}`, 40, 120);
    pdf.addImage(
      imgData,
      "PNG",
      20,
      140,
      pdfWidth - 40,
      pdfHeight - 160
    );
    pdf.save("cet_college_predictions.pdf");
  };

  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h1>CET College Predictor</h1>
      <div style={{ marginBottom: "12px" }}>
        <label>
          Course:&nbsp;
          <select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
          >
            {courses.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div style={{ marginBottom: "12px" }}>
        <label>
          Your CET Rank:&nbsp;
          <input
            type="number"
            value={rank}
            onChange={(e) => setRank(e.target.value)}
            style={{ width: "120px" }}
          />
        </label>
      </div>

      <div style={{ marginBottom: "12px" }}>
        <label>
          Category:&nbsp;
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div style={{ marginBottom: "12px" }}>
        <label>
          Branch (optional):&nbsp;
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
          >
            <option value="">-- All Branches --</option>
            {branches.map((br) => (
              <option key={br} value={br}>
                {br}
              </option>
            ))}
          </select>
        </label>
      </div>

      <button onClick={onFindColleges}>Find Colleges</button>
      &nbsp;
      <button onClick={onDownloadPDF}>Download as PDF</button>

      <hr />

      <div ref={tableRef}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            marginTop: "20px",
          }}
        >
          <thead>
            <tr>
              <th style={{ border: "1px solid #333", padding: "8px" }}>
                Code
              </th>
              <th style={{ border: "1px solid #333", padding: "8px" }}>
                College Name
              </th>
              <th style={{ border: "1px solid #333", padding: "8px" }}>
                Branch
              </th>
              <th style={{ border: "1px solid #333", padding: "8px" }}>
                Category
              </th>
              <th style={{ border: "1px solid #333", padding: "8px" }}>
                Cutoff Rank
              </th>
            </tr>
          </thead>
          <tbody>
            {results.map((row, idx) => (
              <tr key={idx}>
                <td
                  style={{
                    border: "1px solid #ccc",
                    padding: "6px",
                  }}
                >
                  {row.college_code}
                </td>
                <td
                  style={{
                    border: "1px solid #ccc",
                    padding: "6px",
                  }}
                >
                  {row.college_name}
                </td>
                <td
                  style={{
                    border: "1px solid #ccc",
                    padding: "6px",
                  }}
                >
                  {row.branch_code}
                </td>
                <td
                  style={{
                    border: "1px solid #ccc",
                    padding: "6px",
                  }}
                >
                  {row.category}
                </td>
                <td
                  style={{
                    border: "1px solid #ccc",
                    padding: "6px",
                  }}
                >
                  {row.cutoff_rank}
                </td>
              </tr>
            ))}
            {results.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  style={{
                    border: "1px solid #ccc",
                    padding: "6px",
                    textAlign: "center",
                  }}
                >
                  No eligible colleges found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default App;

