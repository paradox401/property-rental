import React, { useEffect, useState, useContext } from "react";
import { AuthContext } from "../../context/AuthContext";
import "./OwnerComplaint.css";

export default function OwnerComplaints() {
  const { user } = useContext(AuthContext);
  const [complaints, setComplaints] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch all complaints
        const complaintsRes = await fetch("http://localhost:8000/api/complaints", {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        if (!complaintsRes.ok) throw new Error("Failed to fetch complaints");
        const complaintsData = await complaintsRes.json();

        // Fetch all properties of this owner
        const propertiesRes = await fetch("http://localhost:8000/api/properties", {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        if (!propertiesRes.ok) throw new Error("Failed to fetch properties");
        const propertiesData = await propertiesRes.json();

        // Map property IDs to titles
        const propertyMap = {};
        propertiesData.forEach((p) => {
          if (p.ownerId === user._id) propertyMap[p._id] = p.title;
        });

        // Filter complaints belonging to this owner
        const ownerComplaints = complaintsData.filter((c) => c.ownerId === user._id);

        // Attach property titles to complaints
        const complaintsWithProperty = ownerComplaints.map((c) => ({
          ...c,
          propertyTitle: propertyMap[c.propertyId] || "N/A",
        }));

        setComplaints(complaintsWithProperty);
        setProperties(propertiesData);
      } catch (err) {
        console.error("❌ Error fetching data:", err);
        setError(err.message || "Something went wrong");
      } finally {
        setLoading(false);
      }
    };

    if (user) fetchData();
  }, [user]);

  return (
    <div className="owner-complaints-container">
      <h1>Complaints Received</h1>

      {loading && <p className="loading">Loading complaints...</p>}
      {error && <p className="error">{error}</p>}

      {!loading && !error && complaints.length === 0 && (
        <p className="empty">No complaints submitted for your properties yet.</p>
      )}

      {!loading && !error && complaints.length > 0 && (
        <div className="table-wrapper">
          <table className="complaints-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Renter Name</th>
                <th>Email</th>
                <th>Property</th>
                <th>Complaint</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {complaints.map((c, index) => (
                <tr key={c._id}>
                  <td>{index + 1}</td>
                  <td>{c.name}</td>
                  <td>{c.email}</td>
                  <td>{c.propertyTitle}</td>
                  <td>{c.complaint}</td>
                  <td>{c.status}</td>
                  <td>{new Date(c.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
