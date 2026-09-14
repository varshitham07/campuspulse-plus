import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';

import Navbar from './components/Navbar';
import BottomNav from './components/BottomNav';
import Toast from './components/Toast';
import ProtectedRoute from './components/ProtectedRoute';

import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Events from './pages/Events';
import EventDetail from './pages/EventDetail';
import Clubs from './pages/Clubs';
import ClubDetail from './pages/ClubDetail';
import ClubRegister from './pages/ClubRegister';
import Incidents from './pages/Incidents';
import IncidentDetail from './pages/IncidentDetail';
import ReportIncident from './pages/ReportIncident';
import CampusMap from './pages/CampusMap';
import Notifications from './pages/Notifications';
import ComposeAnnouncement from './pages/ComposeAnnouncement';
import SearchResults from './pages/SearchResults';
import EventRegistrations from './pages/EventRegistrations';
import NewStudentMode from './pages/NewStudentMode';
import Preferences from './pages/Preferences';
import LocationDirectory from './pages/LocationDirectory';
import AnnouncementsFeed from './pages/AnnouncementsFeed';
import AdminDashboard from './pages/AdminDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import ClubDashboard from './pages/ClubDashboard';
import FormFill from './pages/FormFill';
import FormResponses from './pages/FormResponses';

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <Navbar />
        <Toast />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/map" element={<CampusMap />} />
          <Route path="/welcome" element={<NewStudentMode />} />
          <Route path="/directory" element={<LocationDirectory />} />
          <Route path="/announcements" element={<AnnouncementsFeed />} />
          <Route path="/search" element={<SearchResults />} />
          <Route path="/events" element={<Events />} />
          <Route path="/events/:id" element={<EventDetail />} />
          <Route path="/clubs" element={<Clubs />} />
          <Route path="/clubs/:id" element={<ClubDetail />} />
          <Route path="/incidents" element={<Incidents />} />
          <Route path="/incidents/:id" element={<IncidentDetail />} />
          <Route path="/forms/:id" element={<FormFill />} />

          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
          <Route path="/preferences" element={<ProtectedRoute><Preferences /></ProtectedRoute>} />
          <Route path="/clubs/register" element={<ProtectedRoute><ClubRegister /></ProtectedRoute>} />
          <Route path="/incidents/report" element={<ProtectedRoute><ReportIncident /></ProtectedRoute>} />
          <Route
            path="/announcements/new"
            element={<ProtectedRoute roles={['admin', 'teacher']} allowClubLeader><ComposeAnnouncement /></ProtectedRoute>}
          />
          <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/teacher" element={<ProtectedRoute roles={['teacher']}><TeacherDashboard /></ProtectedRoute>} />
          <Route
            path="/club-dashboard"
            element={<ProtectedRoute allowClubLeader><ClubDashboard /></ProtectedRoute>}
          />
          <Route
            path="/events/:id/registrations"
            element={<ProtectedRoute roles={['admin']} allowClubLeader><EventRegistrations /></ProtectedRoute>}
          />
          <Route
            path="/forms/:id/responses"
            element={<ProtectedRoute roles={['admin']} allowClubLeader><FormResponses /></ProtectedRoute>}
          />

          <Route path="*" element={<div className="container page"><h2>Page not found</h2></div>} />
        </Routes>
        <BottomNav />
      </SocketProvider>
    </AuthProvider>
  );
}
