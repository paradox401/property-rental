"use client"

import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import "./Landing.css"

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <nav className={`navbar ${scrolled ? "scrolled" : ""}`}>
      <div className="navbar-container">
        <div className="logo">
          Property Rental
        </div>
        <div className={`nav-links ${menuOpen ? "open" : ""}`}>
          <a  href="#home" onClick={() => setMenuOpen(false)}>
            Home
          </a>
          <a href="#listings" onClick={() => setMenuOpen(false)}>
            Listings
          </a>
          <a href="#about" onClick={() => setMenuOpen(false)}>
            About
          </a>
          <a href="#contact" onClick={() => setMenuOpen(false)}>
            Contact
          </a>
        </div>
        <div className="nav-right">
          <Link to="/login">
            <button className="login-button">
              <span className="button-text">Log in</span>
            </button>
          </Link>
          <Link to="/register">
            <button className="login-button">
              <span className="button-text">Sign Up</span>
            </button>
          </Link>
          <div className={`hamburger ${menuOpen ? "active" : ""}`} onClick={() => setMenuOpen(!menuOpen)}>
            <div className="bar"></div>
            <div className="bar"></div>
            <div className="bar"></div>
          </div>
        </div>
      </div>
    </nav>
  )
}

const Hero = () => {
  const [searchValue, setSearchValue] = useState("")
  const [isSearchFocused, setIsSearchFocused] = useState(false)

  const handleSearch = () => {
    if (searchValue.trim()) {
      console.log("Searching for:", searchValue)
      // Add search functionality here
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSearch()
    }
  }

  return (
    <section className="hero" id = "home">
      <div className="hero-background">
        <div className="hero-overlay"></div>
      </div>
      <div className="hero-container split-layout">
        <div className="hero-left">
          <div className="hero-content">
            <h1 className="hero-title">
              Find Your Perfect
              <span className="highlight"> Stay</span>
            </h1>
            <p className="hero-subtitle">
              From cozy apartments to luxury villas — your ideal vacation home awaits. Experience comfort, convenience,
              and unforgettable memories.
            </p>
            <div className="hero-search">
              <div className={`search-container ${isSearchFocused ? "focused" : ""}`}>
                <div className="search-icon">🔍</div>
                <input
                  className="search-input"
                  placeholder="Search location, city or landmark..."
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setIsSearchFocused(false)}
                  onKeyPress={handleKeyPress}
                />
                <button className="search-button" onClick={handleSearch} disabled={!searchValue.trim()}>
                  <span>Search</span>
                  <span className="search-arrow">🔍</span>
                </button>
              </div>
            </div>
            <div className="hero-stats">
              <div className="stat">
                <span className="stat-number">10K+</span>
                <span className="stat-label">Properties</span>
              </div>
              <div className="stat">
                <span className="stat-number">50K+</span>
                <span className="stat-label">Happy Guests</span>
              </div>
              <div className="stat">
                <span className="stat-number">100+</span>
                <span className="stat-label">Cities</span>
              </div>
            </div>
          </div>
        </div>
        <div className="hero-right">
          <div className="features-box">
            <div className="features-header">
              <h3>Why Choose StayEase?</h3>
              <div className="features-icon">✨</div>
            </div>
            <ul className="features-list">
              <li>
                <span className="feature-icon">💰</span>
                <span>Affordable and verified listings</span>
              </li>
              <li>
                <span className="feature-icon">📍</span>
                <span>Prime locations across the country</span>
              </li>
              <li>
                <span className="feature-icon">⚡</span>
                <span>Instant booking and secure payments</span>
              </li>
              <li>
                <span className="feature-icon">🛡️</span>
                <span>24/7 customer support</span>
              </li>
              <li>
                <span className="feature-icon">🔄</span>
                <span>Flexible rental terms</span>
              </li>
            </ul>
            <div className="trust-badge">
              <span className="badge-icon">🏆</span>
              <span>Trusted by 50,000+ travelers</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

const FeaturedListings = () => {
  const [hoveredCard, setHoveredCard] = useState(null)

  const listings = [
    {
      id: 1,
      title: "Luxury Beachfront Villa",
      location: "Miami Beach, FL",
      price: 250,
      rating: 4.9,
      reviews: 128,
      image: "https://th.bing.com/th/id/OIP.Wnr3ylT872QDRdnzE2Qe7QHaE8?cb=iwc2&rs=1&pid=ImgDetMain ",
      features: ["Ocean View", "Pool", "WiFi"],
    },
    {
      id: 2,
      title: "Modern Downtown Loft",
      location: "New York, NY",
      price: 180,
      rating: 4.8,
      reviews: 95,
      image: "https://th.bing.com/th/id/R.02498994e29b0c7dee57d4ad4167b747?rik=F9fxQ5MRMkpYyg&pid=ImgRaw&r=0",
      features: ["City View", "Gym", "Parking"],
    },
    {
      id: 3,
      title: "Cozy Mountain Cabin",
      location: "Aspen, CO",
      price: 320,
      rating: 4.7,
      reviews: 156,
      image: "https://i.pinimg.com/originals/fd/2d/3f/fd2d3fcadc022bb9eb8342f89e40f258.jpg",
      features: ["Fireplace", "Hot Tub", "Ski Access"],
    },
  ]

  return (
    <section className="featured" id="listings">
      <div className="container">
        <div className="section-header">
          <h2>Featured Listings</h2>
          <p>Handpicked properties that offer exceptional experiences</p>
        </div>
        <div className="listing-grid">
          {listings.map((listing) => (
            <div
              key={listing.id}
              className={`listing-card ${hoveredCard === listing.id ? "hovered" : ""}`}
              onMouseEnter={() => setHoveredCard(listing.id)}
              onMouseLeave={() => setHoveredCard(null)}
            >
              <div className="listing-image">
                <img src={listing.image || "/placeholder.svg"} alt={listing.title} />
                <div className="listing-overlay">
                  <button className="view-button">View Details</button>
                </div>
                <div className="price-badge">${listing.price}/night</div>
              </div>
              <div className="listing-content">
                <div className="listing-header">
                  <h4>{listing.title}</h4>
                  <div className="rating">
                    <span className="star">⭐</span>
                    <span>{listing.rating}</span>
                    <span className="reviews">({listing.reviews})</span>
                  </div>
                </div>
                <p className="location">📍 {listing.location}</p>
                <div className="features">
                  {listing.features.map((feature, index) => (
                    <span key={index} className="feature-tag">
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="view-all">
          <Link to="/renter/listings" className="view-all-button">
            View All Properties
            <span className="arrow">→</span>
          </Link>
        </div>
      </div>
    </section>
  )
}

const HowItWorks = () => {
  const steps = [
    {
      icon: "🔍",
      title: "Search",
      description: "Browse through thousands of verified properties in your desired location",
    },
    {
      icon: "📅",
      title: "Book",
      description: "Select your dates and book instantly with secure payment protection",
    },
    {
      icon: "🏠",
      title: "Enjoy",
      description: "Check in and enjoy your stay with 24/7 support whenever you need it",
    },
  ]

  return (
    <section className="how-it-works" id="about">
      <div className="container">
        <div className="section-header">
          <h2>How It Works</h2>
          <p>Getting your perfect stay is easier than ever</p>
        </div>
        <div className="steps">
          {steps.map((step, index) => (
            <div key={index} className="step">
              <div className="step-number">{index + 1}</div>
              <div className="step-icon">{step.icon}</div>
              <h4>{step.title}</h4>
              <p>{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

const Testimonials = () => {
  const testimonials = [
    {
      id: 1,
      name: "Sarah Johnson",
      location: "California",
      text: "StayEase made finding the perfect vacation rental so easy! The booking process was seamless and the property exceeded our expectations.",
      rating: 5,
      avatar: "👩‍💼",
    },
    {
      id: 2,
      name: "Mike Chen",
      location: "New York",
      text: "Excellent service and amazing properties. I've used StayEase for multiple trips and they never disappoint. Highly recommended!",
      rating: 5,
      avatar: "👨‍💻",
    },
    {
      id: 3,
      name: "Emma Davis",
      location: "Texas",
      text: "The customer support is outstanding. When we had a small issue, they resolved it immediately. Will definitely use again!",
      rating: 5,
      avatar: "👩‍🎨",
    },
  ]

  return (
    <section className="testimonials">
      <div className="container">
        <div className="section-header">
          <h2>What Our Guests Say</h2>
          <p>Real experiences from real travelers</p>
        </div>
        <div className="testimonial-grid">
          {testimonials.map((testimonial) => (
            <div key={testimonial.id} className="testimonial-card">
              <div className="testimonial-content">
                <div className="quote-icon">"</div>
                <p>{testimonial.text}</p>
                <div className="rating">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <span key={i} className="star">
                      ⭐
                    </span>
                  ))}
                </div>
              </div>
              <div className="testimonial-author">
                <div className="avatar">{testimonial.avatar}</div>
                <div className="author-info">
                  <strong>{testimonial.name}</strong>
                  <span>{testimonial.location}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

const CallToAction = () => (
  <section className="cta" id="contact">
    <div className="container">
      <div className="cta-content">
        <h2>Ready to Start Your Journey?</h2>
        <p>Join thousands of travelers who have found their perfect stay with StayEase</p>
        <div className="cta-buttons">
          <Link to="/register" className="cta-button primary">
            <span>Browse Rentals</span>
            <span className="button-icon">🏠</span>
          </Link>
          <Link to="/register" className="cta-button secondary">
            <span>Become a Host</span>
            <span className="button-icon">💼</span>
          </Link>
        </div>
      </div>
    </div>
  </section>
)

const Footer = () => (
  <footer className="footer">
    <div className="container">
      <div className="footer-content">
        <div className="footer-section">
          <div className="footer-logo">
            <span className="logo-icon">🏠</span>
            StayEase
          </div>
          <p>Your trusted partner for finding the perfect temporary home anywhere in the world.</p>
          <div className="social-links">
            <a href="#" aria-label="Facebook">
              📘
            </a>
            <a href="#" aria-label="Twitter">
              🐦
            </a>
            <a href="#" aria-label="Instagram">
              📷
            </a>
          </div>
        </div>
        <div className="footer-links">
          <div className="link-group">
            <h4>Company</h4>
            <a href="#">About Us</a>
            <a href="#">Careers</a>
            <a href="#">Press</a>
          </div>
          <div className="link-group">
            <h4>Support</h4>
            <a href="#">Help Center</a>
            <a href="#">Safety</a>
            <a href="#">Contact Us</a>
          </div>
          <div className="link-group">
            <h4>Hosting</h4>
            <a href="#">Become a Host</a>
            <a href="#">Host Resources</a>
            <a href="#">Community</a>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <p>&copy; 2025 StayEase. All rights reserved.</p>
      </div>
    </div>
  </footer>
)

const Landing = () => (
  <div className="landing-page">
    <Navbar />
    <Hero />
    <FeaturedListings />
    <HowItWorks />
    <Testimonials />
    <CallToAction />
    <Footer />
  </div>
)

export default Landing
