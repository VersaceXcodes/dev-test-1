import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/store/main';
import { Link } from 'react-router-dom';

const UV_Landing: React.FC = () => {
  // Zustand State and Actions
  const featuredGreetings = useAppStore(state => state.featuredGreetings);
  const openAuthModal = useAppStore(state => state.openAuthModal);
  const fetchFeaturedGreetings = useAppStore(state => state.fetchFeaturedGreetings);
  const currentUser = useAppStore(state => state.authentication_state.current_user);

  // Scroll State
  const [scrolled, setScrolled] = useState(false);

  // Fetch featured greetings on mount
  useEffect(() => {
    fetchFeaturedGreetings();
  }, [fetchFeaturedGreetings]);

  // Handle scroll events
  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 100;
      setScrolled(isScrolled);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Redirect if authenticated (handled by root route, but included for safety)
  if (currentUser) return null;

  return (
    <>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-50 to-indigo-100">
        {/* Hero Content */}
      </section>

      {/* Feature Highlights */}
      <section className="bg-white py-16">
        {/* Features Grid */}
      </section>

      {/* Demo Videos */}
      <section className="py-16 bg-gray-50">
        {/* Video Grid */}
      </section>

      {/* Testimonials */}
      <section className="py-16">
        {/* Testimonial Grid */}
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-12">
        {/* Footer Content */}
      </footer>

      {/* Scroll-Dependent CTA */}
      {scrolled && (
        <div className="fixed bottom-0 left-0 w-full bg-white shadow-lg py-2 px-4 z-50">
          {/* Sticky CTA */}
        </div>
      )}
    </>
  );
};

export default UV_Landing;