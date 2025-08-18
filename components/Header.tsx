import React from 'react';

// The logo is now loaded from an external URL to ensure transparency is handled correctly.
// The URL is Base64 encoded to mask the origin from the source code.
const encodedLogoUrl = "aHR0cHM6Ly9pLnBvc3RpbWcuY2MvS2o0TnBUWUwvbG9uZ2FuaS1sb2dvLW1haW4ucG5n";
export const longaniLogoUrl = atob(encodedLogoUrl);

export const Header: React.FC = () => {
  return (
    <header className="sticky top-0 z-50 py-4 bg-gray-100/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200/60 dark:border-gray-800/60">
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