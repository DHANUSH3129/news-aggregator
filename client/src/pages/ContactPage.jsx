import React from 'react';

function ContactPage() {
  return (
    <div className="contact-container">
      <div className="contact-card">
        <h2>Contact Us</h2>
        <p>We'd love to hear from you! Whether you have a question, feedback, or a news tip, please feel free to reach out.</p>
        <div className="contact-details">
          <div className="contact-item">
            <strong>Email:</strong>
            <a href="mailto:contact@newsbreaker.com">contact@newsbreaker.com</a>
          </div>
          <div className="contact-item">
            <strong>Phone:</strong>
            <span>+91 98765 43210</span>
          </div>
          <div className="contact-item">
            <strong>Address:</strong>
            <span>123 News Lane, Bengaluru, Karnataka, India</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ContactPage;