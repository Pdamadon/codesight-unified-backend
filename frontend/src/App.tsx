import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Welcome from './pages/Welcome';
import Registration from './pages/Registration';
import SessionSetup from './pages/SessionSetup';
import Recording from './pages/Recording';
import SessionReview from './pages/SessionReview';
import SessionComplete from './pages/SessionComplete';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/register" element={<Registration />} />
        <Route path="/session-setup" element={<SessionSetup />} />
        <Route path="/recording" element={<Recording />} />
        <Route path="/session-review" element={<SessionReview />} />
        <Route path="/session-complete" element={<SessionComplete />} />
        <Route path="*" element={<div>Page Not Found</div>} />
      </Routes>
    </Router>
  );
}

export default App;