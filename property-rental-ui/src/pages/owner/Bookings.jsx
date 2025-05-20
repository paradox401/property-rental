import React, { useState, useEffect } from 'react';
import './Bookings.css';

export default function Bookings() {
  const [bookings, setBookings] = useState([]);

  // Dummy data (replace with real API calls)
  useEffect(() => {
    const dummyBookings = [
      {
        id: 1,
        tenant: 'John Doe',
        property: 'Sunny Apartment',
        fromDate: '2025-06-01',
        toDate: '2025-06-10',
        status: 'Pending',
      },
      {
        id: 2,
        tenant: 'Jane Smith',
        property: 'Cozy Studio',
        fromDate: '2025-07-05',
        toDate: '2025-07-15',
        status: 'Approved',
      },
    ];
    setBookings(dummyBookings);
  }, []);

  const handleApprove = (id) => {
    setBookings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: 'Approved' } : b))
    );
  };

  const handleReject = (id) => {
    setBookings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: 'Rejected' } : b))
    );
  };

  return (
    <div className="bookings-container">
      <h2>Booking Requests</h2>
      <table className="bookings-table">
        <thead>
          <tr>
            <th>Tenant</th>
            <th>Property</th>
            <th>From</th>
            <th>To</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {bookings.map(({ id, tenant, property, fromDate, toDate, status }) => (
            <tr key={id}>
              <td>{tenant}</td>
              <td>{property}</td>
              <td>{fromDate}</td>
              <td>{toDate}</td>
              <td className={`status ${status.toLowerCase()}`}>{status}</td>
              <td>
                {status === 'Pending' && (
                  <>
                    <button className="btn-approve" onClick={() => handleApprove(id)}>Approve</button>
                    <button className="btn-reject" onClick={() => handleReject(id)}>Reject</button>
                  </>
                )}
                {(status === 'Approved' || status === 'Rejected') && <span>—</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
