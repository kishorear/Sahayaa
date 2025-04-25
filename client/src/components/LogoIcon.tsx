import React from 'react';

interface LogoIconProps {
  className?: string;
}

const LogoIcon: React.FC<LogoIconProps> = ({ className = "w-8 h-8" }) => {
  // Light blue color
  const lightBlueColor = "#6A9AC7";
  
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 64 64" 
      className={className}
    >
      {/* Solid bold circle in light blue */}
      <circle cx="32" cy="32" r="30" fill={lightBlueColor} />
      
      {/* Exclamation Mark in white */}
      <circle cx="32" cy="45" r="3" fill="white" />
      <rect x="29" y="15" width="6" height="22" rx="3" fill="white" />
    </svg>
  );
};

export default LogoIcon;