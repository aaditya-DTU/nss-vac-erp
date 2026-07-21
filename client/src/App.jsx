import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import LandingPage from './pages/LandingPage';
import Leaderboard from './pages/Leaderboard';
import Announcements from './pages/Announcements';
import Gallery from './pages/Gallery';
import Responsibilities from './pages/Responsibilities';
import Ideas from './pages/Ideas';
import Events from './pages/Events';
import Certificate from './pages/Certificate';
import VerifyCertificate from './pages/VerifyCertificate';
import EventJoin from './pages/EventJoin';

import StudentDashboard from './pages/student/StudentDashboard';
import Tasks from './pages/student/Tasks';
import TaskDetail from './pages/student/TaskDetail';

import AdminDashboard from './pages/admin/AdminDashboard';
import AdminTasks from './pages/admin/AdminTasks';
import AdminStudents from './pages/admin/AdminStudents';
import AdminVerifyCertificate from './pages/admin/AdminVerifyCertificate';
import AdminUnanswered from './pages/admin/AdminUnanswered';

function RoleHome() {
  const { user } = useAuth();
  return <Navigate to={user?.role === 'admin' ? '/admin' : '/student'} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/about" element={<LandingPage />} />
      <Route path="/verify" element={<VerifyCertificate />} />
      <Route path="/verify/:certificateId" element={<VerifyCertificate />} />

      {/* Student routes */}
      <Route path="/student" element={<ProtectedRoute roles={['student']}><StudentDashboard /></ProtectedRoute>} />
      <Route path="/tasks" element={<ProtectedRoute roles={['student']}><Tasks /></ProtectedRoute>} />
      <Route path="/tasks/:id" element={<ProtectedRoute roles={['student']}><TaskDetail /></ProtectedRoute>} />
      <Route path="/certificate" element={<ProtectedRoute roles={['student']}><Certificate /></ProtectedRoute>} />
      <Route path="/events/:id/join" element={<ProtectedRoute roles={['student']}><EventJoin /></ProtectedRoute>} />

      {/* Admin routes */}
      <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/tasks" element={<ProtectedRoute roles={['admin']}><AdminTasks /></ProtectedRoute>} />
      <Route path="/admin/students" element={<ProtectedRoute roles={['admin']}><AdminStudents /></ProtectedRoute>} />
      <Route path="/admin/events" element={<ProtectedRoute roles={['admin']}><Events /></ProtectedRoute>} />
      <Route path="/admin/verify-certificate" element={<ProtectedRoute roles={['admin']}><AdminVerifyCertificate /></ProtectedRoute>} />
      <Route path="/admin/chatbot-gaps" element={<ProtectedRoute roles={['admin']}><AdminUnanswered /></ProtectedRoute>} />

      {/* Shared routes */}
      <Route path="/leaderboard" element={<ProtectedRoute roles={['admin', 'student']}><Leaderboard /></ProtectedRoute>} />
      <Route path="/announcements" element={<ProtectedRoute roles={['admin', 'student']}><Announcements /></ProtectedRoute>} />
      <Route path="/gallery" element={<ProtectedRoute roles={['admin', 'student']}><Gallery /></ProtectedRoute>} />
      <Route path="/responsibilities" element={<ProtectedRoute roles={['admin', 'student']}><Responsibilities /></ProtectedRoute>} />
      <Route path="/ideas" element={<ProtectedRoute roles={['admin', 'student']}><Ideas /></ProtectedRoute>} />
      <Route path="/events" element={<ProtectedRoute roles={['admin', 'student']}><Events /></ProtectedRoute>} />

      <Route path="*" element={<ProtectedRoute><RoleHome /></ProtectedRoute>} />
    </Routes>
  );
}