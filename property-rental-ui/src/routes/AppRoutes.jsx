import React, { useContext } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from '../pages/login/Login';
import OwnerLayout from '../layouts/OwnerLayout';
import RenterLayout from '../layouts/RenterLayout';
import OwnerDashboard from '../pages/owner/Dashboard';
import MyProperties from '../pages/owner/MyProperties';
import RenterHome from '../pages/renter/Home';
import AddProperty from '../pages/owner/AddProperty';
import Bookings from '../pages/owner/Bookings';
import MyBookings from '../pages/renter/MyBookings';
import Listings from '../pages/renter/Listings';
import Favorites from '../pages/renter/Favorites';
import Register from '../pages/login/register';
import Landing from '../pages/Landing';
import { AuthContext } from '../context/AuthContext';
import PropertyDetails from '../components/common/PropertyDetails';

function PrivateRoute({ children, role }) {
  const { user } = useContext(AuthContext);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== role) {
    return <Navigate to={`/${user.role}`} replace />;
  }

  return children;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route
        path="/owner/*"
        element={
          <PrivateRoute role="owner">
            <OwnerLayout />
          </PrivateRoute>
        }
      >
        <Route index element={<OwnerDashboard />} />
        <Route path="properties" element={<MyProperties />} /> 
        <Route path="add" element={<AddProperty />} />
        <Route path="requests" element={<Bookings />} />
      </Route>

      <Route
        path="/renter/*"
        element={
          <PrivateRoute role="renter">
            <RenterLayout />
          </PrivateRoute>
        }
      >
        <Route index element={<RenterHome />} />
        <Route path="bookings" element={<MyBookings />} />
        <Route path="listings" element={<Listings />} />
        <Route path="favorites" element={<Favorites />} />
      </Route>
      <Route path="/property/:id" element={<PropertyDetails />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
