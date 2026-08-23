import poster1 from "../assets/posters/poster1.jpg";
import poster2 from "../assets/posters/poster2.jpg";
import poster3 from "../assets/posters/poster3.webp";
import poster4 from "../assets/posters/poster4.webp";
import poster5 from "../assets/posters/poster5.webp";
import poster6 from "../assets/posters/poster6.webp";

import "../styles/login.css";
import "../styles/posterAnimation.css";

import React from "react";


const posters = [
  poster3,
  poster6,
  poster1,
  poster4,
  poster5,
  poster2,
];


function PosterColumn({ direction = "up" }) {

  // 4 complete sets
  const repeated = [
    ...posters,
    ...posters,
    ...posters,
    ...posters
  ];

  return (
    <div
      className={`poster-column ${
        direction === "up" ? "move-up" : "move-down"
      }`}
    >

      {repeated.map((poster, index) => (

        <img
          src={poster}
          alt="Movie poster"
          className="movie-poster"
          key={`${poster}-${index}`}
        />

      ))}

    </div>
  );
}


export default function PosterAnimation() {

  return (

    <div className="poster-area">

      {/* Moving poster columns */}

      <div className="poster-columns">

        <PosterColumn direction="up" />

        <PosterColumn direction="down" />

        <PosterColumn direction="up" />

        <PosterColumn direction="down" />

      </div>


      {/* Dark overlay */}

      <div className="poster-overlay"></div>


      {/* MovieVerse name */}

      <div className="movieverse-logo">
        MovieVerse
      </div>

    </div>

  );
}