import { createBrowserRouter } from 'react-router';
import { App } from './App';
import { AdminPage } from './pages/AdminPage';
import { BookingPage } from './pages/BookingPage';
import { HomePage } from './pages/HomePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { MeetingTypeDetailPage } from './pages/admin/MeetingTypeDetailPage';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: App,
    children: [
      { index: true, Component: HomePage },
      { path: 'booking', Component: BookingPage },
      { path: 'admin', Component: AdminPage },
      { path: 'admin/meeting-types/:id', Component: MeetingTypeDetailPage },
      { path: '*', Component: NotFoundPage },
    ],
  },
]);
