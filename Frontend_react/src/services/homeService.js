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
export const postReview = async (movieId, reviewText, rating, isSpoiler=false ) => {
  try {
    const token = localStorage.getItem("token");
    const response = await fetch(`http://127.0.0.1:5000/reviews/${movieId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      // Backend ko text aur rating dono bhej rahe hain
      body: JSON.stringify({ review_text: reviewText, rating: rating ,is_spoiler: isSpoiler}) 
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
    // 🌟 Yahan URL mein '/movie/' aur aage '/reviews' lagana hai
    const response = await fetch(`http://127.0.0.1:5000/movie/${movieId}/reviews`, {
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

// Global Search (Movies & Users)
export const performSearch = async (query, type = "movie") => {
  if (!query) return [];
  try {
    const token = localStorage.getItem("token");
    // URL mein type parameter bhej rahe hain
    const res = await fetch(`http://127.0.0.1:5000/search?q=${encodeURIComponent(query)}&type=${type}`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Search failed");
    return await res.json();
  } catch (error) {
    console.error("API Error in performSearch:", error);
    return [];
  }
};

// Get Search History
export const getSearchHistory = async () => {
  try {
    const token = localStorage.getItem("token");
    const res = await fetch(`http://127.0.0.1:5000/search/history`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.history || [];
  } catch (error) {
    return [];
  }
};

// Clear Search History
export const clearSearchHistory = async () => {
  try {
    const token = localStorage.getItem("token");
    const res = await fetch(`http://127.0.0.1:5000/search/history`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${token}` }
    });
    return res.ok;
  } catch (error) {
    return false;
  }
};

export const getUserAnalytics = async (userId) => {
  try {
    const res = await fetch(`http://127.0.0.1:5000/profile/${userId}/analytics`);
    if (!res.ok) throw new Error("Analytics failed");
    return await res.json();
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return null;
  }
};

export const getUserCollections = async (userId) => {
  try {
    const res = await fetch(`http://127.0.0.1:5000/user/${userId}/collections`);
    if (!res.ok) return [];
    return await res.json();
  } catch (error) {
    return [];
  }
};

export const createCollection = async (title, description) => {
  try {
    const token = localStorage.getItem("token");
    const res = await fetch(`http://127.0.0.1:5000/collections`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ title, description })
    });
    return res.ok;
  } catch (error) {
    return false;
  }
};

export const addMovieToCollection = async (collectionId, movieId) => {
  try {
    const token = localStorage.getItem("token");
    const res = await fetch(`http://127.0.0.1:5000/collections/${collectionId}/movies`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ movie_id: movieId })
    });
    const data = await res.json();
    return { success: res.ok, message: data.message || data.error };
  } catch (error) {
    return { success: false, message: "Network error" };
  }
};

export const getCollectionDetails = async (collectionId) => {
  try {
    const res = await fetch(`http://127.0.0.1:5000/collections/${collectionId}`);
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    return null;
  }
};

export const searchUsers = async (query) => {
  try {
    const res = await fetch(`http://127.0.0.1:5000/users/search?q=${query}`);
    if (!res.ok) return [];
    return await res.json();
  } catch (error) {
    return [];
  }
};

export const toggleFollowUser = async (targetUserId) => {
  try {
    const token = localStorage.getItem("token");
    const currentUserId = localStorage.getItem("user_id"); // NAYA: Logged-in user ki ID
    
    const res = await fetch(`http://127.0.0.1:5000/user/${targetUserId}/follow`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ current_user_id: currentUserId }) // Body mein ID bhej rahe hain
    });
    return await res.json();
  } catch (error) {
    return null;
  }
};

export const getUserFollowStats = async (userId) => {
  try {
    const res = await fetch(`http://127.0.0.1:5000/user/${userId}/stats`);
    if (!res.ok) return { followers_count: 0, following_count: 0 };
    return await res.json();
  } catch (error) {
    return { followers_count: 0, following_count: 0 };
  }
};


export const updateUserProfile = async (userId, updateData) => {
  try {
    const token = localStorage.getItem("token");
    const res = await fetch(`http://127.0.0.1:5000/profile/${userId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(updateData) // { username, bio } pass karenge
    });
    const data = await res.json();
    return { success: res.ok, message: data.message || data.error };
  } catch (error) {
    return { success: false, message: "Network error" };
  }
};


export const getActorMovies = async (actorName, page = 1, sortBy = "year") => {
  try {
    // 🌟 NAYA: URL mein query parameters add kar diye
    const response = await fetch(`http://127.0.0.1:5000/actor/${encodeURIComponent(actorName)}?page=${page}&sort_by=${sortBy}`);
    if (!response.ok) throw new Error("Failed to fetch actor movies");
    return await response.json();
  } catch (error) {
    console.error("API Error in getActorMovies:", error);
    return [];
  }
};

export const getFollowersList = async (userId) => {
  try {
    const res = await fetch(`http://127.0.0.1:5000/user/${userId}/followers`);
    if (!res.ok) return [];
    return await res.json();
  } catch (error) {
    return [];
  }
};

export const getFollowingList = async (userId) => {
  try {
    const res = await fetch(`http://127.0.0.1:5000/user/${userId}/following`);
    if (!res.ok) return [];
    return await res.json();
  } catch (error) {
    return [];
  }
};

export const getUserReviews = async (userId) => {
  try {
    const response = await fetch(`http://127.0.0.1:5000/user/${userId}/reviews`);
    if (!response.ok) throw new Error("Failed to fetch user reviews");
    return await response.json();
  } catch (error) {
    console.error("API Error in getUserReviews:", error);
    return [];
  }
};

export const getMovieTrailerKey = async (title, year) => {
  try {
    const res = await fetch(`http://127.0.0.1:5000/movie/trailer?title=${encodeURIComponent(title)}&year=${encodeURIComponent(year || "")}`);
    const data = await res.json();
    if (res.ok && data.videoId) {
      return data.videoId; // 👈 Sahi 11-character video ID aani chahiye
    }
    return null;
  } catch (error) {
    console.error("Trailer API Fetch Error:", error);
    return null;
  }
};

// 🎲 Get Surprise Movie
export const getSurpriseMovie = async () => {
  try {
    const token = localStorage.getItem("token");
    const response = await fetch(`http://127.0.0.1:5000/movie/surprise`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });
    if (!response.ok) throw new Error("Failed to fetch surprise");
    return await response.json(); // Yeh { movie_id: 1000xxx } dega
  } catch (error) {
    console.error("API Error in getSurpriseMovie:", error);
    return null;
  }
};