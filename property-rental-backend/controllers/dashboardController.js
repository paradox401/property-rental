import Property from '../models/Property.js';
import Booking from '../models/Booking.js';
import Favorite from '../models/Favorite.js';

export const getOwnerDashboardStats = async (req, res) => {
    try {
      const ownerId = req.user._id;
  
      const properties = await Property.find({ ownerId }).sort({ createdAt: -1 });
      const propertyIds = properties.map(p => p._id);
  
      const bookings = await Booking.find({ property: { $in: propertyIds } });
  
      const favorites = await Favorite.find({ property: { $in: propertyIds } });
  
      // Count bookings by their status: Approved, Pending, Rejected
      const bookingStatusCount = bookings.reduce((acc, booking) => {
        const status = booking.status || 'Pending';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});
  
      // Monthly properties added
      const propertyStats = await Property.aggregate([
        { $match: { ownerId } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]);
  
      // Build a map: propertyId -> latest booking status
      // Find latest booking per property
      const latestBookingMap = {};
  
      bookings.forEach(booking => {
        const pid = booking.property.toString();
        const current = latestBookingMap[pid];
        if (!current || booking.createdAt > current.createdAt) {
          latestBookingMap[pid] = booking;
        }
      });
  
      // Attach booking status to each recent property (latest 5)
      const recentProperties = properties.slice(0, 5).map(p => {
        const booking = latestBookingMap[p._id.toString()];
        return {
          ...p.toObject(),
          status: booking ? booking.status : 'Available'
        };
      });
  
      res.json({
        totalProperties: properties.length,
        totalBookings: bookings.length,
        totalFavorites: favorites.length,
        bookingStatusCount,
        recentProperties,
        propertyStats: propertyStats.map(p => ({
          month: p._id,
          count: p.count
        }))
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to load dashboard data' });
    }
  };
  

  export const getRenterDashboardStats = async (req, res) => {
    try {
      const renterId = req.user._id;
  
      const bookings = await Booking.find({ renter: renterId }).populate('property');
      const favorites = await Favorite.find({ user: renterId });
  
      const bookingStatusCount = bookings.reduce((acc, b) => {
        const status = b.status || 'Pending';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});
  
      const bookingStats = await Booking.aggregate([
        { $match: { renter: renterId } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]);
  
      res.json({
        bookings: bookings.length,
        favorites: favorites.length,
        bookingStatusCount,
        bookingStats: bookingStats.map((b) => ({
          month: b._id,
          count: b.count
        })),
        recent: bookings.slice(0, 5)
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to load renter dashboard data' });
    }
  };
