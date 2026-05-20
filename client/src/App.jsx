import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import Navbar from './components/Navbar.jsx';

// Lazy loading pages for optimized performance
const Home = lazy(() => import('./pages/Home.jsx'));
const Explore = lazy(() => import('./pages/Explore.jsx'));
const Genres = lazy(() => import('./pages/Genres.jsx'));
const GenrePage = lazy(() => import('./pages/GenrePage.jsx'));
const Library = lazy(() => import('./pages/Library.jsx'));
const Reader = lazy(() => import('./pages/Reader.jsx'));
const StoryInfo = lazy(() => import('./pages/StoryInfo.jsx'));
const Login = lazy(() => import('./pages/Login.jsx'));

// Loading indicator component
const PageLoader = () => (
  <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] bg-background">
    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
    <p className="mt-4 text-muted text-sm font-medium tracking-wide">Loading StoryScape...</p>
  </div>
);

// Protected route middleware for authenticated sections
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

// Main routing container
const AppContent = () => {
  return (
    <Router>
      <div className="flex flex-col min-h-screen bg-background text-white selection:bg-primary/30 selection:text-white">
        {/* Navbar is displayed on all pages except the Reader which uses its own custom transparent menu */}
        <Routes>
          <Route path="/story/:id" element={null} />
          <Route path="/login" element={null} />
          <Route path="*" element={<Navbar />} />
        </Routes>

        <main className="flex-grow flex flex-col">
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/explore" element={<Explore />} />
              <Route path="/genres" element={<Genres />} />
              <Route path="/genres/:genre" element={<GenrePage />} />
              <Route path="/story/:id/info" element={<StoryInfo />} />
              <Route path="/story/:id" element={<Reader />} />
              <Route path="/login" element={<Login />} />
              <Route
                path="/library"
                element={
                  <ProtectedRoute>
                    <Library />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </main>
        
        <Toaster
          position="bottom-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1C1C21',
              color: '#F9FAFB',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              fontFamily: "'Inter', sans-serif",
            },
            success: {
              iconTheme: {
                primary: '#7C3AED',
                secondary: '#F9FAFB',
              },
            },
          }}
        />
      </div>
    </Router>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
