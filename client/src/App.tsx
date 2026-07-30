import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ErrorBoundary } from './components/error-boundary';
import { LoadingScreen } from './components/LoadingScreen';
const Layout = React.lazy(() => import('./pages/Layout'));
const Login = React.lazy(() => import('./pages/Login'));
const LandingPage = React.lazy(() => import('./pages/LandingPage'));
const AboutSBG = React.lazy(() => import('./pages/AboutSBG'));
const ClubsCommitteesPage = React.lazy(() => import('./pages/ClubsCommitteesPage'));
const ClubDashboard = React.lazy(() => import('./lib/ClubDashboard'));
const AdminDashboard = React.lazy(() => import('./pages/AdminDashboard'));
const AdminVenues = React.lazy(() => import('./pages/AdminVenues'));
const BookSlot = React.lazy(() => import('./pages/BookSlot'));
const AdminClubs = React.lazy(() => import('./pages/AdminClubs'));
const AdminRequests = React.lazy(() => import('./pages/AdminRequests'));
const PolicyPage = React.lazy(() => import('./pages/PolicyPage'));
const MyBookings = React.lazy(() => import('./pages/MyBookings'));
const ClubMembers = React.lazy(() => import('./pages/ClubMembers'));
const ClubCommittee = React.lazy(() => import('./pages/ClubCommittee'));
const ManageEvents = React.lazy(() => import('./pages/ManageEvents'));
const EventReports = React.lazy(() => import('./pages/EventReports'));
const AdminEventReports = React.lazy(() => import('./pages/AdminEventReports'));
const Archives = React.lazy(() => import('./pages/Archives'));
import { User } from './types';
import { PublicLayout } from './components/PublicLayout';
import { apiRequest } from './lib/api';
import { getSocket, reconnectSocket, SOCKET_EVENTS } from './lib/socket';

const USER_STORAGE_KEY = 'sbg_user_profile';

const getCachedUser = (): User | null => {
  if (typeof window === 'undefined') return null;

  const raw = localStorage.getItem(USER_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as User;
    if (!parsed?.email || !parsed?.name || !parsed?.role) {
      localStorage.removeItem(USER_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    localStorage.removeItem(USER_STORAGE_KEY);
    return null;
  }
};

const cacheUser = (nextUser: User | null) => {
  if (typeof window === 'undefined') return;

  if (!nextUser) {
    localStorage.removeItem(USER_STORAGE_KEY);
    return;
  }

  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(nextUser));
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(() => getCachedUser());
  const [isInitializing, setIsInitializing] = useState(() => {
    if (typeof window === 'undefined') return true;
    return !getCachedUser();
  });

  // Establish the socket on every load (even anonymous) so the build-version
  // handshake can detect and recover from a stale, cached frontend bundle.
  useEffect(() => {
    getSocket();
  }, []);

  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      try {
        const userProfile = await apiRequest<User>('/api/auth/profile');

        if (!isMounted) return;
        setUser(userProfile);
        cacheUser(userProfile);
      } catch (error) {
        if (!isMounted) return;
        console.error('Failed to verify session token:', error);
        handleSessionFailed();
      } finally {
        if (isMounted) setIsInitializing(false);
      }
    };

    initAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSessionFailed = () => {
    setUser(null);
    cacheUser(null);
  };

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    cacheUser(loggedInUser);

    reconnectSocket();

    // Join the appropriate socket room after login
    const socket = getSocket();

    if (!socket) return;

    if (loggedInUser.role === 'admin') {
      socket.emit(SOCKET_EVENTS.JOIN_ADMIN);
    } else if (loggedInUser.email) {
      apiRequest<{ id: string }[]>('/api/clubs').then(clubs => {
        const match = clubs.find((c: any) => c.email === loggedInUser.email);
        if (match?.id) socket.emit(SOCKET_EVENTS.JOIN_CLUB, match.id);
      }).catch(() => { });
    }
  };

  const handleLogout = async () => {
    setUser(null);
    cacheUser(null);
    reconnectSocket();

    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  // Global socket room joining
  useEffect(() => {
    if (!user) return;

    const socket = getSocket();
    if (!socket) return;

    if (user.role === 'admin') {
      socket.emit(SOCKET_EVENTS.JOIN_ADMIN);
    } else if (user.email) {
      apiRequest<{ id: string }[]>('/api/clubs').then(clubs => {
        const match = clubs.find((c: any) => c.email === user.email);
        if (match?.id) socket.emit(SOCKET_EVENTS.JOIN_CLUB, match.id);
      }).catch(() => { });
    }
  }, [user]);

  if (isInitializing) {
    return <LoadingScreen />;
  }

  if (!user) {
    return (
      <ErrorBoundary>
        <BrowserRouter>
          <React.Suspense fallback={<LoadingScreen />}>
            <Routes>
              <Route path="/login" element={<Login onLogin={handleLogin} />} />
              <Route element={<PublicLayout onGoToLogin={() => { window.location.href = '/login'; }} />}>
                <Route path="/clubs-committees" element={<ClubsCommitteesPage />} />
                <Route path="/about-sbg" element={<AboutSBG />} />
                <Route path="*" element={<LandingPage />} />
              </Route>
            </Routes>
          </React.Suspense>
        </BrowserRouter>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Layout user={user} onLogout={handleLogout}>
          <React.Suspense fallback={<LoadingScreen />}>
            <Routes>
              <Route path="/" element={user.role === 'club' ? <ClubDashboard user={user} /> : <AdminDashboard />} />

              <Route path="/book" element={<BookSlot currentUser={user} />} />
              <Route path="/my-bookings" element={<MyBookings />} />
              <Route path="/manage-events" element={<ManageEvents currentUser={user} />} />
              <Route path="/event-reports" element={<EventReports />} />
              <Route path="/members" element={<ClubMembers user={user} />} />
              <Route path="/committee" element={user.role === 'club' ? <ClubCommittee user={user} /> : <Navigate to="/" replace />} />
              <Route path="/policy" element={<PolicyPage />} />

              <Route path="/admin/requests" element={<AdminRequests />} />

              <Route path="/admin/clubs" element={user.role === 'admin' ? <AdminClubs /> : <Navigate to="/" replace />} />
              <Route path="/admin/venues" element={user.role === 'admin' ? <AdminVenues /> : <Navigate to="/" replace />} />
              <Route path="/admin/event-reports" element={user.role === 'admin' ? <AdminEventReports /> : <Navigate to="/" replace />} />
              <Route path="/archives" element={<Archives />} />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </React.Suspense>
        </Layout>
      </BrowserRouter>
    </ErrorBoundary>
  );
};

export default App;
