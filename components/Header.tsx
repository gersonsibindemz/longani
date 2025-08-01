import React from 'react';

// The logo is now loaded from an external URL to ensure transparency is handled correctly.
export const longaniLogoUrl = "https://i.postimg.cc/Kj4NpTYL/longani-logo-main.png";

export const Header: React.FC = () => {
  return (
    <header className="sticky top-0 z-50 py-4 bg-gray-100/80 backdrop-blur-lg border-b border-gray-200/60">
      <div className="container mx-auto px-4 flex items-center justify-center">
        <img
          src={longaniLogoUrl}
          alt="Longani Logo"
          className="h-28 pointer-events-none select-none"
          draggable="false"
          onContextMenu={(e) => e.preventDefault()}
        />
      </div>
    </header>
  );
};