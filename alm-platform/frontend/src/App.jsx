import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import EventDashboard from './pages/EventDashboard'
import BudgetRequest from './pages/BudgetRequest'
import FinancePortal from './pages/FinancePortal'
import StandardsPage from './pages/StandardsPage'
import OutreachPage from './pages/OutreachPage'
import TasksPage from './pages/TasksPage'
import Navbar from './components/Navbar'
import './index.css'

function ProtectedRoute({ children, editRoles }) {
  const token = localStorage.getItem('alm_token')
  if (!token) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<ProtectedRoute><Navbar /><EventDashboard /></ProtectedRoute>} />
        
        <Route path="/finance" element={<ProtectedRoute><Navbar /><FinancePortal /></ProtectedRoute>} />
        <Route path="/standards" element={<ProtectedRoute><Navbar /><StandardsPage /></ProtectedRoute>} />
        <Route path="/outreach" element={<ProtectedRoute><Navbar /><OutreachPage /></ProtectedRoute>} />
        <Route path="/tasks" element={<ProtectedRoute><Navbar /><TasksPage /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  )
}