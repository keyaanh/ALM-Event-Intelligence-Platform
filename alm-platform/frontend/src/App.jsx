import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import EventDashboard from './pages/EventDashboard'
import FinancePortal from './pages/FinancePortal'
import StandardsPage from './pages/StandardsPage'
import OutreachPage from './pages/OutreachPage'
import TasksPage from './pages/TasksPage'
import EducationPage from './pages/EducationPage'
import MemberPortal from './pages/MemberPortal'
import Navbar from './components/Navbar'
import './index.css'

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('alm_token')
  if (!token) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes — no login needed */}
        <Route path="/login" element={<Login />} />
        <Route path="/members" element={<MemberPortal />} />
        <Route path="/" element={
          localStorage.getItem('alm_token')
            ? <Navigate to="/dashboard" replace />
            : <Navigate to="/members" replace />
        } />

        {/* Protected officer routes */}
        <Route path="/dashboard" element={<ProtectedRoute><Navbar /><EventDashboard /></ProtectedRoute>} />
        <Route path="/finance" element={<ProtectedRoute><Navbar /><FinancePortal /></ProtectedRoute>} />
        <Route path="/standards" element={<ProtectedRoute><Navbar /><StandardsPage /></ProtectedRoute>} />
        <Route path="/outreach" element={<ProtectedRoute><Navbar /><OutreachPage /></ProtectedRoute>} />
        <Route path="/tasks" element={<ProtectedRoute><Navbar /><TasksPage /></ProtectedRoute>} />
        <Route path="/education" element={<ProtectedRoute><Navbar /><EducationPage /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  )
}