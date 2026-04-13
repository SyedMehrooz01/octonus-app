import React from 'react';

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export const Logo = ({ className = "", size = "md" }: LogoProps) => {
  const sizeClasses = {
    sm: "h-12 w-20",
    md: "h-24 w-36",
    lg: "h-48 w-72",
  };

  return (
    <div className={`relative flex items-center justify-center ${sizeClasses[size]} ${className} overflow-visible`}>
      <svg
        viewBox="-50 0 400 250"
        className="h-full w-full overflow-visible"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Green Circle background */}
        <circle cx="80" cy="100" r="70" fill="#9ACD32" />

        {/* Swooshes with shadows */}
        <g filter="url(#shadow)">
          <path d="M100 50C130 50 200 65 240 70C200 68 130 58 100 55Z" fill="#FF4500" />
          <path d="M100 75C130 75 200 90 240 95C200 93 130 83 100 80Z" fill="#00BFFF" />
          <path d="M100 100C130 100 200 115 240 120C200 118 130 108 100 105Z" fill="#FFD700" />
        </g>

        {/* Text "Octonus" in white script style with a subtle dark shadow for visibility */}
        <text
          x="60"
          y="150"
          fontFamily="'Dancing Script', cursive, system-ui"
          fontSize="80"
          fill="white"
          filter="url(#textShadow)"
          style={{ fontStyle: 'italic', fontWeight: 'bold' }}
        >
          Octonus
        </text>

        {/* Text "Solutions" in blue script style */}
        <text
          x="120"
          y="200"
          fontFamily="'Dancing Script', cursive, system-ui"
          fontSize="60"
          fill="#00BFFF"
          style={{ fontStyle: 'italic' }}
        >
          Solutions
        </text>

        {/* Bottom Tagline */}
        <line x1="40" y1="215" x2="260" y2="215" stroke="#9ACD32" strokeWidth="2" />
        <text
          x="45"
          y="235"
          fontFamily="sans-serif"
          fontSize="14"
          fill="#9ACD32"
          letterSpacing="2"
          fontWeight="bold"
        >
          A SPECTACULAR TURN OF EVENTS
        </text>

        <defs>
          <filter id="shadow" x="0" y="0" width="200%" height="200%">
            <feDropShadow dx="2" dy="2" stdDeviation="2" floodOpacity="0.4" />
          </filter>
          <filter id="textShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="1" dy="1" stdDeviation="2" floodOpacity="0.3" floodColor="#000" />
          </filter>
        </defs>
      </svg>
    </div>
  );
};

export default Logo;
