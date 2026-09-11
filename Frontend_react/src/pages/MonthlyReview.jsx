import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getUserProfile } from "../services/homeService";
import Navbar from "../components/Navbar";
import SearchModal from "../components/SearchModal";
import "../styles/monthlyReview.css";
import CinematicLoader from "../components/CinematicLoader";

export default function MonthlyReview() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const currentUserId = localStorage.getItem("user_id");

  useEffect(() => {
    window.scrollTo(0, 0);
    const fetchReviews = async () => {
      if (!currentUserId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      const data = await getUserProfile(currentUserId);
      if (data && data.reviews) {
        setReviews(data.reviews);
      }
      setLoading(false);
    };
    fetchReviews();
  }, [currentUserId]);

  // Calendar Logic
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sunday
  
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  // Extract this month's reviews
  const thisMonthReviews = reviews.filter(review => {
    const rDate = new Date(review.created_at);
    return rDate.getFullYear() === year && rDate.getMonth() === month;
  });

  // Group reviews by date
  const reviewsByDate = {};
  thisMonthReviews.forEach(review => {
    const day = new Date(review.created_at).getDate();
    if (!reviewsByDate[day]) reviewsByDate[day] = [];
    reviewsByDate[day].push(review);
  });

  const getRatingColor = (rating) => {
    if (rating >= 4.5) return "#00d26a"; // Perfect
    if (rating >= 3.5) return "#00b894"; // Good
    if (rating >= 2.0) return "#fdcb6e"; // Avg
    return "#ff4757"; // Bad
  };

  if (!currentUserId) return <h1 className="error-text">Please login to see your calendar.</h1>;

  return (
    <div className="monthly-review-page">
      <Navbar onOpenSearch={() => setIsSearchOpen(true)} />
      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

      <main className="calendar-container">
        
        {/* HEADER CONTROLS */}
        <div className="calendar-header">
          <div className="cal-nav">
            <button className="cal-btn" onClick={handlePrevMonth}>&#8592; Prev</button>
            <h1 className="cal-title">{monthNames[month]} <span>{year}</span></h1>
            <button className="cal-btn" onClick={handleNextMonth}>Next &#8594;</button>
          </div>
          <div className="cal-stats">
            You reviewed <strong>{thisMonthReviews.length}</strong> movies this month.
          </div>
        </div>

        {loading ? (
          <h2 className="loading-text">Loading Calendar...</h2>
        ) : (
          <div className="calendar-grid">
            {/* Days of Week */}
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
              <div key={d} className="day-name">{d}</div>
            ))}

            {/* Empty boxes for offset */}
            {Array(firstDayOfMonth).fill(null).map((_, i) => (
              <div key={`empty-${i}`} className="calendar-cell empty"></div>
            ))}

            {/* Actual Days */}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
              const dayReviews = reviewsByDate[day] || [];
              const isToday = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();

              return (
                <div key={day} className={`calendar-cell ${dayReviews.length > 0 ? 'has-reviews' : ''} ${isToday ? 'is-today' : ''}`}>
                  <span className="date-number">{day}</span>
                  
                  <div className="cell-reviews">
                    {dayReviews.map(review => (
                      <Link 
                        to={`/movie/${review.movie_id}`} 
                        key={review.review_id} 
                        className="movie-tag"
                        style={{ borderLeftColor: getRatingColor(review.rating) }}
                        title={`${review.title} - ${review.rating} Stars`}
                      >
                        {review.title}
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}