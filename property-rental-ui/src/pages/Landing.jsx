import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './Landing.css';

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="logo">StayEase</div>
        <div className={`nav-links ${menuOpen ? 'open' : ''}`}>
          <Link to="/">Home</Link>
          <Link to="/renter/listings">Listings</Link>
          <a href="#about">About</a>
          <a href="#contact">Contact</a>
        </div>
        <div className="nav-right">
          <Link to="/login">
            <button className="login-button">Login</button>
          </Link>
          <div className="hamburger" onClick={() => setMenuOpen(!menuOpen)}>
            <div className="bar"></div>
            <div className="bar"></div>
            <div className="bar"></div>
          </div>
        </div>
      </div>
    </nav>
  );
};

const Hero = () => (
  <section className="hero">
    <div className="hero-container split-layout">
      <div className="hero-left">
        <div className="hero-content">
          <h1>Find Your Perfect Stay</h1>
          <p>From cozy apartments to luxury villas — your ideal vacation home awaits.</p>
          <div className="hero-search">
            <input className="search-input" placeholder="Search location, city or landmark..." />
            <button className="search-button">Search</button>
          </div>
        </div>
      </div>
      <div className="hero-right">
        <div className="features-box">
          <h3>Why Choose Us?</h3>
          <ul className="features-list">
            <li> Affordable and verified listings</li>
            <li> Prime locations across the country</li>
            <li> Instant booking and secure payments</li>
            <li> 24/7 customer support</li>
            <li> Flexible rental terms</li>
          </ul>
        </div>
      </div>
    </div>
  </section>
);

const FeaturedListings = () => (
  <section className="featured">
    <h2>Featured Listings</h2>
    <div className="listing-grid">
      {[1, 2, 3].map(i => (
        <div key={i} className="listing-card">
          <div className="listing-image">Image</div>
          <h4>Cozy Apartment {i}</h4>
          <p>$120/night • New York</p>
        </div>
      ))}
    </div>
  </section>
);

const HowItWorks = () => (
  <section className="how-it-works" id="about">
    <h2>How It Works</h2>
    <div className="steps">
      {['Search', 'Book', 'Enjoy'].map((step, index) => (
        <div key={index} className="step">
          <div className="step-icon">🔍</div>
          <h4>{step}</h4>
          <p>Step {index + 1}</p>
        </div>
      ))}
    </div>
  </section>
);

const Testimonials = () => (
  <section className="testimonials">
    <h2>What Our Users Say</h2>
    <div className="testimonial-grid">
      {[1, 2, 3].map(i => (
        <div key={i} className="testimonial-card">
          <p>"Amazing experience!"</p>
          <p><strong>User {i}</strong></p>
        </div>
      ))}
    </div>
  </section>
);

const CallToAction = () => (
  <section className="cta" id="contact">
    <h2>Ready to start your journey?</h2>
    <button className="cta-button">Browse Rentals</button>
  </section>
);

const Footer = () => (
  <footer className="footer">
    <p>&copy; 2025 StayEase. All rights reserved.</p>
  </footer>
);

const Landing = () => (
  <div>
    <Navbar />
    <Hero />
    <FeaturedListings />
    <HowItWorks />
    <Testimonials />
    <CallToAction />
    <Footer />
  </div>
);

export default Landing;
