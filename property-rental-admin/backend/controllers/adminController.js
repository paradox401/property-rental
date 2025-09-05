import User from '../models/User.js';
import Property from '../models/Property.js';
import Booking from '../models/Booking.js';
import Complaint from '../models/Complaint.js';

export const getAllUsers = async (req, res) => {
  const users = await User.find();
  res.json(users);
};

export const getAllProperties = async (req, res) => {
  const properties = await Property.find();
  res.json(properties);
};

export const getAllBookings = async (req, res) => {
  const bookings = await Booking.find();
  res.json(bookings);
};

export const getAllComplaints = async (req, res) => {
  const complaints = await Complaint.find();
  res.json(complaints);
};

export const markComplaintResolved = async (req, res) => {
  const { id } = req.params;
  const complaint = await Complaint.findByIdAndUpdate(id, { resolved: true }, { new: true });
  res.json(complaint);
};
