import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import QuoteCard from './components/QuoteCard';
import AdminDashboard from './components/AdminDashboard';
import Login from './components/Login';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<QuoteCard />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/login" element={<Login />} />
      </Routes>
    </Router>
  );
}

