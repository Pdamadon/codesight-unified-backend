import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
}

const Layout: React.FC<LayoutProps> = ({ children, title = 'CodeSight Research Platform' }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">
            {title}
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Online Shopping Behavior Research Platform
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-16">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="text-center text-sm text-gray-500">
            <p>© 2025 CodeSight Research. Academic research platform for studying online shopping behaviors.</p>
            <p className="mt-2">
              All sessions are recorded with participant consent for research purposes only.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;