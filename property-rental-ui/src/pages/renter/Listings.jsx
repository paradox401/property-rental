import { useEffect, useState } from 'react';
import PropertyCard from '../../components/common/PropertyCard';
import './Listings.css';
import PropertyDetails from '../../components/common/PropertyDetails';
import BookingPopup from '../../components/common/BookingPopup';
import { API_BASE_URL } from '../../config/api';

export default function Listings() {
  const [allProperties, setAllProperties] = useState([]);
  const [filteredProperties, setFilteredProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDetailsId, setShowDetailsId] = useState(null);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    minPrice: '',
    maxPrice: '',
    bedrooms: '',
    type: '',
    bathrooms: '',
    sort: 'newest',
  });

  const fetchProperties = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.set('q', searchTerm);
      if (filters.minPrice) params.set('minPrice', filters.minPrice);
      if (filters.maxPrice) params.set('maxPrice', filters.maxPrice);
      if (filters.bathrooms === '4+') params.set('bathroomsGte', '4');
      else if (filters.bathrooms) params.set('bathrooms', filters.bathrooms);
      if (filters.bedrooms === '4+') params.set('bedroomsGte', '4');
      else if (filters.bedrooms) params.set('bedrooms', filters.bedrooms);
      if (filters.type) params.set('type', filters.type);
      if (filters.sort) params.set('sort', filters.sort);

      const res = await fetch(`${API_BASE_URL}/api/properties?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch properties');
      setAllProperties(data);
      setFilteredProperties(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchProperties();
    }, 300);

    return () => clearTimeout(timeout);
  }, [searchTerm, filters]);

  const closeDetailsModal = () => setShowDetailsId(null);
  const openBookingPopup = (property) => setSelectedProperty(property);
  const closeBookingPopup = () => setSelectedProperty(null);

  const handleClearSearch = () => {
    setSearchTerm('');
  };

  if (loading) return <p>Loading properties...</p>;
  if (error) return <p className="error">{error}</p>;

  return (
    <div className="listings-page">
      <h2>Available Properties</h2>

      <div className="filters">
        <input
          type="text"
          placeholder="Search by title, location, or description..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {searchTerm && (
          <button className="clear-btn" onClick={handleClearSearch}>
            Clear
          </button>
        )}
        <input
          type="number"
          placeholder="Min price"
          value={filters.minPrice}
          onChange={(e) => setFilters((prev) => ({ ...prev, minPrice: e.target.value }))}
        />
        <input
          type="number"
          placeholder="Max price"
          value={filters.maxPrice}
          onChange={(e) => setFilters((prev) => ({ ...prev, maxPrice: e.target.value }))}
        />
        <select
          value={filters.bedrooms}
          onChange={(e) => setFilters((prev) => ({ ...prev, bedrooms: e.target.value }))}
        >
          <option value="">Bedrooms</option>
          <option value="1">1</option>
          <option value="2">2</option>
          <option value="3">3</option>
          <option value="4+">4+</option>
        </select>
        <select
          value={filters.bathrooms}
          onChange={(e) => setFilters((prev) => ({ ...prev, bathrooms: e.target.value }))}
        >
          <option value="">Bathrooms</option>
          <option value="1">1</option>
          <option value="2">2</option>
          <option value="3">3</option>
          <option value="4+">4+</option>
        </select>
        <select
          value={filters.type}
          onChange={(e) => setFilters((prev) => ({ ...prev, type: e.target.value }))}
        >
          <option value="">Type</option>
          <option value="Apartment">Apartment</option>
          <option value="House">House</option>
          <option value="Condo">Condo</option>
        </select>
        <select
          value={filters.sort}
          onChange={(e) => setFilters((prev) => ({ ...prev, sort: e.target.value }))}
        >
          <option value="newest">Newest</option>
          <option value="priceLow">Price: Low to High</option>
          <option value="priceHigh">Price: High to Low</option>
        </select>
      </div>

      {filteredProperties.length === 0 && !loading && !error ? (
        <p
          style={{
            textAlign: 'center',
            fontSize: '1.125rem',
            color: '#64748b',
            padding: '2rem',
            border: '2px dashed #cbd5e1',
            borderRadius: '0.75rem',
            maxWidth: '500px',
            margin: '2rem auto',
            backgroundColor: '#ffffff',
          }}
        >
          No properties found matching your search.
        </p>
      ) : (
        <div className="listings-grid">
          {filteredProperties.map((listing) => (
            <PropertyCard
              key={listing._id}
              property={listing}
              onViewDetails={() => setShowDetailsId(listing._id)}
              onApplyBooking={() => openBookingPopup(listing)}
            />
          ))}
        </div>
      )}

      {showDetailsId && (
        <div className="modal-overlay" onClick={closeDetailsModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeDetailsModal}>
              X
            </button>
            <PropertyDetails id={showDetailsId} />
          </div>
        </div>
      )}
      {selectedProperty && (
        <BookingPopup property={selectedProperty} onClose={closeBookingPopup} />
      )}
    </div>
  );
}
