import React from 'react';

interface LogoIconProps {
  className?: string;
}

const LogoIcon: React.FC<LogoIconProps> = ({ className = "w-8 h-8" }) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 64 64" 
      className={className}
    >
      {/* Background Circle */}
      <circle cx="32" cy="32" r="30" fill="#4F46E5" />
      
      {/* Chat Bubble */}
      <path d="M20 24h24v12H32l-6 6v-6h-6V24z" fill="white" />
      
      {/* AI Symbol */}
      <path d="M28 28h8v4h-8v-4z" fill="#4F46E5" />
    </svg>
  );
};

export default LogoIcon;