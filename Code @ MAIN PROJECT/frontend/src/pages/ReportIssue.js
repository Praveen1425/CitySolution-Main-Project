import React, { useState } from "react";
import { CATEGORIES } from "../utils/constants";
import "./ReportIssue.css";

const ReportIssue = () => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [image, setImage] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Handle image selection (no AI detection)
  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (file && !file.type.startsWith('image/')) {
      alert('Please select only image files (PNG, JPG, GIF)');
      return;
    }
    setImage(file);
  };

  // Get current location
  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setLocation(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        },
        (error) => {
          console.error("Error getting location:", error);
          alert("Unable to get your location. Please enter it manually.");
        }
      );
    } else {
      alert("Geolocation is not supported by this browser.");
    }
  };

  // Submit issue
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !description || !category || !location) {
      alert("Please fill all required fields!");
      return;
    }

    setUploading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("Please login to report an issue!");
        return;
      }

      const formData = new FormData();
      formData.append("title", title);
      formData.append("description", description);
      formData.append("category", category);
      formData.append("location", location);
      if (image) {
        formData.append("image", image);
      }

      const API_URL = "https://civicsync-project.onrender.com/api";
      const response = await fetch(`${API_URL}/issues`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error === "DUPLICATE_INCIDENT" || data.message?.includes("Duplicate")) {
          alert("⚠️ Duplicate issue detected!\n\nThis issue already exists on blockchain!\n\nOur system checks the cryptographic hash of your issue data on the blockchain. If a record with the same hash already exists, you are alerted to prevent duplicate submissions.");
        } else {
          alert(`Error: ${data.error || data.message || "Failed to submit issue"}`);
        }
        return;
      }

      if (data.chain) {
        alert(`✅ Issue successfully recorded and secured on blockchain!\n\nTransaction Hash: ${data.chain.txHash.substring(0, 20)}...\nBlock Number: ${data.chain.blockNumber}`);
      } else {
        alert("✅ Issue successfully reported!");
      }

      // Reset form
      setTitle("");
      setDescription("");
      setCategory("");
      setLocation("");
      setImage(null);
    } catch (error) {
      console.error("Submission failed:", error);
      alert("Error submitting issue! Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="report-issue-page">
      <div className="container">
        <h1>Report a New Issue</h1>
        <p className="subtitle">
          Help improve your community by reporting civic issues. All fields marked with * are required.
        </p>

        <form onSubmit={handleSubmit} className="report-form">
          <div className="form-group">
            <label htmlFor="title">Issue Title*</label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Broken streetlight on Main Street"
              maxLength={125}
              required
            />
            <div className="char-count">{title.length}/125 characters</div>
          </div>

          <div className="form-group">
            <label htmlFor="description">Detailed Description*</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide detailed information about the issue, including any relevant context"
              maxLength={1000}
              required
            />
            <div className="char-count">{description.length}/1000 characters</div>
          </div>

          <div className="form-group">
            <label htmlFor="category">Category*</label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
            >
              <option value="">Select a category</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="location">Location*</label>
            <div className="location-input-container">
              <input
                type="text"
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Sector 15, Near Central Park or use location icon"
                required
              />
              <span className="location-icon" onClick={getCurrentLocation} title="Get current location">
                📍
              </span>
            </div>
          </div>

          <div className="form-group">
            <label>Upload Image (Optional)</label>
            <div className="upload-area">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                style={{ display: "none" }}
                id="image-upload"
              />
              <label htmlFor="image-upload" className="upload-label">
                <div className="upload-content">
                  <p>Click to upload or drag and drop</p>
                  <p>PNG, JPG, GIF up to 5MB</p>
                  {image && <p>Selected: {image.name}</p>}
                </div>
              </label>
            </div>
          </div>

          <button type="submit" disabled={uploading} className="submit-btn">
            {uploading ? "Submitting..." : "Submit Issue Report"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ReportIssue;
