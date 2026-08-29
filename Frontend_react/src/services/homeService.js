export async function getHomeData() {

  const token = localStorage.getItem("token");

  if (!token) {
    throw new Error("User is not logged in");
  }

  const response = await fetch(
    "http://127.0.0.1:5000/home",
    {
      method: "GET",

      headers: {
        "Authorization": `Bearer ${token}`
      }
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error || "Failed to load home data"
    );
  }

  return data;
}

// Movie Detail fetch karne ka function
export const getMovieDetail = async (movieId) => {
  try {
    // Apne Flask server ka address check kar lena, normally 5000 port par hota hai.
    const response = await fetch(`http://127.0.0.1:5000/movie/${movieId}`);
    
    if (!response.ok) {
      throw new Error("Failed to fetch movie details");
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("API Error in getMovieDetail:", error);
    return null; // Return null taaki red screen handle ho sake
  }
};

export const performSearch = async (searchQuery, searchType = "movie") => {
  if (!searchQuery) return [];
  
  try {
    const token = localStorage.getItem("token"); 
    // API URL mein '&type=' bhej rahe hain
    const response = await fetch(`http://127.0.0.1:5000/search?q=${searchQuery}&save=false&type=${searchType}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      }
    });

    if (!response.ok) throw new Error("Search failed");
    return await response.json();
  } catch (error) {
    console.error("API Error in performSearch:", error);
    return [];
  }
};

// Toggle Review Like
export const toggleReviewLike = async (reviewId) => {
  try {
    const token = localStorage.getItem("token"); // Token zaroori hai
    const response = await fetch(`http://127.0.0.1:5000/reviews/${reviewId}/like`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      }
    });

    if (!response.ok) throw new Error("Failed to toggle like");
    
    return await response.json(); // Yeh backend se {liked: true/false, likes_count: 5} layega
  } catch (error) {
    console.error("API Error in toggleReviewLike:", error);
    return null;
  }
};

// Post a new review
// postReview mein 'rating' add kiya
export const postReview = async (movieId, reviewText, rating) => {
  try {
    const token = localStorage.getItem("token");
    const response = await fetch(`http://127.0.0.1:5000/reviews/${movieId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      // Backend ko text aur rating dono bhej rahe hain
      body: JSON.stringify({ review_text: reviewText, rating: rating }) 
    });

    if (!response.ok) throw new Error("Failed to post review");
    return await response.json();
  } catch (error) {
    console.error("API Error in postReview:", error);
    return null;
  }
};

// Get all reviews for a movie
export const getMovieReviews = async (movieId) => {
  try {
    const token = localStorage.getItem("token");
    const response = await fetch(`http://127.0.0.1:5000/reviews/${movieId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      }
    });

    if (!response.ok) throw new Error("Failed to fetch reviews");
    return await response.json();
  } catch (error) {
    console.error("API Error in getMovieReviews:", error);
    return { reviews: [] };
  }
};

// Get User Profile Data
export const getUserProfile = async (userId) => {
  try {
    const token = localStorage.getItem("token");
    const response = await fetch(`http://127.0.0.1:5000/profile/${userId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      }
    });

    if (!response.ok) throw new Error("Failed to fetch user profile");
    return await response.json();
  } catch (error) {
    console.error("API Error in getUserProfile:", error);
    return null;
  }
};

// Get Watchlist
export const getWatchlist = async () => {
  try {
    const token = localStorage.getItem("token");
    const res = await fetch("http://127.0.0.1:5000/watchlist", {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Failed to fetch watchlist");
    const data = await res.json();
    return data.watchlist || []; // Tere backend ke JSON response se match kiya
  } catch (error) {
    console.error("API Error in getWatchlist:", error);
    return [];
  }
};

// Add to Watchlist
export const addToWatchlist = async (movieId) => {
  try {
    const token = localStorage.getItem("token");
    const res = await fetch(`http://127.0.0.1:5000/watchlist/${movieId}`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}` }
    });
    
    if (res.status === 409) {
      alert("Movie is already in your watchlist!");
      return false;
    }
    
    return res.ok;
  } catch (error) {
    console.error("API Error in addToWatchlist:", error);
    return false;
  }
};

// Remove from Watchlist
export const removeFromWatchlist = async (movieId) => {
  try {
    const token = localStorage.getItem("token");
    const res = await fetch(`http://127.0.0.1:5000/watchlist/${movieId}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${token}` }
    });
    return res.ok;
  } catch (error) {
    console.error("API Error in removeFromWatchlist:", error);
    return false;
  }
};