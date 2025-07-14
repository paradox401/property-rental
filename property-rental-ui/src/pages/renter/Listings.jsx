"use client"

import { useEffect, useState } from "react"
import PropertyCard from "../../components/common/PropertyCard"
import "./Listings.css" // Assuming you already have this CSS file
import PropertyDetails from "../../components/common/PropertyDetails"
import BookingPopup from "../../components/common/BookingPopup"

export default function Listings() {
  const [allProperties, setAllProperties] = useState([]) // Stores all fetched properties
  const [filteredProperties, setFilteredProperties] = useState([]) // Stores properties after filtering
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showDetailsId, setShowDetailsId] = useState(null)
  const [selectedProperty, setSelectedProperty] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")

  // Debounce function to limit how often the search term updates
  const debounce = (func, delay) => {
    let timeout
    return function (...args) {
      
      clearTimeout(timeout)
      timeout = setTimeout(() => func.apply(this, args), delay)
    }
  }

  // Effect to fetch all properties initially
  useEffect(() => {
    const fetchAllProperties = async () => {
      setLoading(true)
      try {
        const res = await fetch("http://localhost:8000/api/properties")
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Failed to fetch properties")
        setAllProperties(data)
        setFilteredProperties(data) // Initialize filtered properties with all properties
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchAllProperties()
  }, []) // Empty dependency array means this runs only once on mount

  // Effect to filter properties based on searchTerm
  useEffect(() => {
    const filterProperties = () => {
      if (!searchTerm) {
        setFilteredProperties(allProperties) // If search term is empty, show all properties
        return
      }
      const lowerCaseSearchTerm = searchTerm.toLowerCase()
      const filtered = allProperties.filter(
        (property) =>
          property.title.toLowerCase().includes(lowerCaseSearchTerm) ||
          property.location.toLowerCase().includes(lowerCaseSearchTerm) ||
          property.description.toLowerCase().includes(lowerCaseSearchTerm), // Added description to search
      )
      setFilteredProperties(filtered)
    }

    // Debounce the filter function
    const debouncedFilter = debounce(filterProperties, 300) // 300ms debounce
    debouncedFilter()

    // Cleanup function for debounce
    return () => clearTimeout(debouncedFilter)
  }, [searchTerm, allProperties]) // Re-run when searchTerm or allProperties change

  const closeDetailsModal = () => setShowDetailsId(null)
  const openBookingPopup = (property) => setSelectedProperty(property)
  const closeBookingPopup = () => setSelectedProperty(null)

  const handleClearSearch = () => {
    setSearchTerm("")
  }

  if (loading) return <p>Loading properties...</p>
  if (error) return <p className="error">{error}</p>

  return (
    <div className="listings-page">
      <h2>Available Properties</h2>
      {/* Search Input Field with inline styles */}
      <div
        style={{
          marginBottom: "2rem",
          textAlign: "center",
          position: "relative",
          maxWidth: "500px",
          margin: "0 auto 2rem auto",
        }}
      >
        <input
          type="text"
          placeholder="Search by title, location, or description..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: "100%",
            padding: "0.875rem 2.5rem 0.875rem 1.25rem" /* Added space for clear button */,
            border: "2px solid #e2e8f0",
            borderRadius: "0.75rem",
            fontSize: "1rem",
            color: "#374151",
            backgroundColor: "#ffffff",
            transition: "all 0.2s ease",
            fontFamily: "inherit",
            boxSizing: "border-box",
            boxShadow: "0 1px 3px 0 rgba(0,0,0,0.05)",
          }}
        />
        {searchTerm && (
          <button
            onClick={handleClearSearch}
            style={{
              position: "absolute",
              right: "0.75rem",
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              color: "#9ca3af",
              fontSize: "1.2rem",
              cursor: "pointer",
              padding: "0.2rem",
              lineHeight: "1",
              transition: "color 0.2s ease",
            }}
          >
            &times; {/* Times symbol for clear */}
          </button>
        )}
      </div>

      {filteredProperties.length === 0 && !loading && !error ? (
        <p
          style={{
            textAlign: "center",
            fontSize: "1.125rem",
            color: "#64748b",
            padding: "2rem",
            border: "2px dashed #cbd5e1",
            borderRadius: "0.75rem",
            maxWidth: "500px",
            margin: "2rem auto",
            backgroundColor: "#ffffff",
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
      {selectedProperty && <BookingPopup property={selectedProperty} onClose={closeBookingPopup} />}
    </div>
  )
}
