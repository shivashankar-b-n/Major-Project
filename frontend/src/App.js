import React from 'react';
import '@/App.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/contexts/AuthContext';
import { LanguageProvider, useLang } from '@/contexts/LanguageContext';
import { ProtectedRoute } from '@/components/common/ProtectedRoute';

import { CitizenShell } from '@/components/layout/CitizenShell';
import { DashboardShell } from '@/components/layout/DashboardShell';

import Landing from '@/pages/Landing';
import Login from '@/pages/auth/Login';
import Register from '@/pages/auth/Register';

import CitizenHome from '@/pages/citizen/Home';
import ReportIssue from '@/pages/citizen/ReportIssue';
import MyComplaints from '@/pages/citizen/MyComplaints';
import ComplaintDetails from '@/pages/citizen/ComplaintDetails';
import Notifications from '@/pages/citizen/Notifications';
import Profile from '@/pages/citizen/Profile';

import OfficerDashboard from '@/pages/officer/Dashboard';
import OfficerQueue from '@/pages/officer/Queue';
import FieldMap from '@/pages/officer/FieldMap';
import OfficerAnalytics from '@/pages/officer/Analytics';
import OfficerReports from '@/pages/officer/Reports';

import AdminDashboard from '@/pages/admin/Dashboard';
import AdminComplaints from '@/pages/admin/Complaints';
import CityMap from '@/pages/admin/CityMap';
import AdminAnalytics from '@/pages/admin/Analytics';
import AdminReports from '@/pages/admin/Reports';
import DataSources from '@/pages/admin/DataSources';
import AdminUsers from '@/pages/admin/Users';

import ComplaintWork from '@/pages/shared/ComplaintWork';

function AppRoutes() {
  const { lang } = useLang();
  return (
    <React.Fragment key={lang}>
      <Routes>
        {/* Public */}
        <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Citizen */}
          <Route
            path="/app"
            element={<ProtectedRoute roles={['citizen']}><CitizenShell /></ProtectedRoute>}
          >
            <Route index element={<CitizenHome />} />
            <Route path="report" element={<ReportIssue />} />
            <Route path="complaints" element={<MyComplaints />} />
            <Route path="complaints/:id" element={<ComplaintDetails />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="profile" element={<Profile />} />
          </Route>

          {/* Officer */}
          <Route
            path="/officer"
            element={<ProtectedRoute roles={['officer']}><DashboardShell role="officer" /></ProtectedRoute>}
          >
            <Route index element={<OfficerDashboard />} />
            <Route path="queue" element={<OfficerQueue />} />
            <Route path="map" element={<FieldMap />} />
            <Route path="analytics" element={<OfficerAnalytics />} />
            <Route path="reports" element={<OfficerReports />} />
            <Route path="complaints/:id" element={<ComplaintWork backTo="/officer/queue" />} />
          </Route>

          {/* Admin */}
          <Route
            path="/admin"
            element={<ProtectedRoute roles={['admin']}><DashboardShell role="admin" /></ProtectedRoute>}
          >
            <Route index element={<AdminDashboard />} />
            <Route path="complaints" element={<AdminComplaints />} />
            <Route path="complaints/:id" element={<ComplaintWork backTo="/admin/complaints" />} />
            <Route path="map" element={<CityMap />} />
            <Route path="analytics" element={<AdminAnalytics />} />
            <Route path="reports" element={<AdminReports />} />
            <Route path="data-sources" element={<DataSources />} />
            <Route path="users" element={<AdminUsers />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    </React.Fragment>
  );
}

function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <BrowserRouter>
          <AppRoutes />
          <Toaster position="top-center" richColors closeButton />
        </BrowserRouter>
      </LanguageProvider>
    </AuthProvider>
  );
}

export default App;
