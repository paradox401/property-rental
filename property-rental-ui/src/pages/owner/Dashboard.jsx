import React from 'react';
import './Dashboard.css';

export default function OwnerDashboard() {
  const stats = [
    { title: 'Total Properties', value: 12 },
    { title: 'Pending Requests', value: 4 },
    { title: 'Approved Requests', value: 8 },
    { title: 'Total Tenants', value: 6 },
  ];

  return (
    <div className="dashboard-grid">
      {stats.map((item, index) => (
        <div className="card" key={index}>
          <h4>{item.title}</h4>
          <p>{item.value}</p>
        </div>
      ))}
    </div>
  );
}
