import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, ChevronRight, AlertCircle, Calendar as CalendarIcon, Users, AlertTriangle, RefreshCw, Plus, Check, X, Settings, ChevronDown, Download } from 'lucide-react';
import { apiRequest, mapBooking, type ApiBooking, type ApiVenue } from '../lib/api';
import { getErrorMessage } from '../lib/errors';
import { toastError, toastSuccess } from '../lib/toast';
import { Booking, GroupedBooking } from '../types';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { Skeleton } from '../components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '../components/ui/dropdown-menu';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Calendar, type CalendarEvent } from '../components/ui/calendar';
import AddBookingDialog from '../components/AddBookingDialog';
import RegisterEventDialog from '../components/RegisterEventDialog';
import { groupBookings } from '../lib/api';
import { getSocket, SOCKET_EVENTS } from '../lib/socket';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

const AdminDashboard: React.FC = () => {
  const [pendingRequests, setPendingRequests] = React.useState<GroupedBooking[]>([]);
  const [venues, setVenues] = React.useState<ApiVenue[]>([]);
  const [stats, setStats] = React.useState({
    pending: 0,
    scheduled: 0,
    conflicts: 0,
    activeClubs: 0
  });
  const [isLoading, setIsLoading] = React.useState(true);

  const [calendarEvents, setCalendarEvents] = React.useState<GroupedBooking[]>([]);
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(new Date());
  const [error, setError] = React.useState<string | null>(null);
  const [addDialogOpen, setAddDialogOpen] = React.useState(false);
  const [registerDialogOpen, setRegisterDialogOpen] = React.useState(false);
  const [isProcessingAction, setIsProcessingAction] = React.useState(false);

  // SBG Settings State
  const [sbgSettingsOpen, setSbgSettingsOpen] = React.useState(false);
  const [isSavingSettings, setIsSavingSettings] = React.useState(false);
  const [sbgSettings, setSbgSettings] = React.useState({
    sbg_constitution_link: '',
    sbg_linkedin: '',
    sbg_email: ''
  });

  const fetchSbgSettings = async () => {
    try {
      const config = await apiRequest<Record<string, string>>('/api/settings', { auth: true });
      setSbgSettings({
        sbg_constitution_link: config.sbg_constitution_link || '',
        sbg_linkedin: config.sbg_linkedin || '',
        sbg_email: config.sbg_email || ''
      });
    } catch (err) {
      console.error('Failed to fetch SBG settings', err);
    }
  };

  const saveSbgSettings = async () => {
    setIsSavingSettings(true);
    try {
      await apiRequest('/api/settings', {
        method: 'POST',
        auth: true,
        body: sbgSettings
      });
      toastSuccess('SBG Settings saved successfully');
      setSbgSettingsOpen(false);
    } catch (error: any) {
      toastError(error, 'Failed to save SBG settings');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const getVenueName = (id: string) => venues.find(v => v.id === id)?.name || id;

  const exportAllEvents = React.useCallback(async () => {
    try {
      const eventsData = await apiRequest<any[]>('/api/events', { auth: true });
      if (eventsData.length === 0) {
        toastError('No events to export');
        return;
      }
      const headers = ['Event Name', 'Club Name', 'Start Date', 'Start Time', 'End Date', 'End Time', 'Venue', 'Status', 'Event Type'];
      const rows = eventsData.map(e => {
        const startDate = e.date ? new Date(e.date) : null;
        const endDate = e.end_date ? new Date(e.end_date) : null;
        return {
          'Event Name': e.name || '',
          'Club Name': e.club_name || e.club_id || '',
          'Start Date': startDate ? startDate.toLocaleDateString() : '',
          'Start Time': startDate ? startDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '',
          'End Date': endDate ? endDate.toLocaleDateString() : '',
          'End Time': endDate ? endDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '',
          'Venue': e.venue || '',
          'Status': e.status || '',
          'Event Type': e.event_type || ''
        };
      });
      
      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Events');
      
      XLSX.writeFile(workbook, `all-events-${new Date().toISOString().slice(0, 10)}.xlsx`);
      
      toastSuccess('Events exported successfully');
    } catch (err) {
      toastError(err, 'Failed to export events');
    }
  }, []);

  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [venuesData, pendingData, statsData, allBookingsData] = await Promise.all([
        apiRequest<ApiVenue[]>('/api/venues'),
        apiRequest<ApiBooking[]>('/api/admin/pending', { auth: true }),
        apiRequest<{ pending: number; scheduled: number; conflicts: number; activeClubs: number }>('/api/admin/stats', { auth: true }),
        apiRequest<ApiBooking[]>('/api/admin/bookings', { auth: true })
      ]);

      setVenues(venuesData);
      setPendingRequests(groupBookings(pendingData.map(mapBooking)));
      setStats(statsData);
      setCalendarEvents(groupBookings(allBookingsData.map(mapBooking)));
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError(getErrorMessage(err, 'Failed to load dashboard.'));
      setPendingRequests([]);
      setStats({ pending: 0, scheduled: 0, conflicts: 0, activeClubs: 0 });
      setCalendarEvents([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchData();
    fetchSbgSettings();
  }, [fetchData]);

  // Socket.io: join admin room and listen for new booking requests
  React.useEffect(() => {
    const socket = getSocket();
    socket.emit(SOCKET_EVENTS.JOIN_ADMIN);
    const handleBookingNew = (payload: { eventName: string; clubName: string; venueNames: string }) => {
      toast.message('New Booking Request', {
        description: `${payload.clubName} requested "${payload.eventName}" at ${payload.venueNames}`,
      });
      fetchData(); // refresh the dashboard
    };

    const handleEventsUpdated = () => {
      fetchData();
    };

    socket.on(SOCKET_EVENTS.BOOKING_NEW, handleBookingNew);
    socket.on(SOCKET_EVENTS.EVENTS_UPDATED, handleEventsUpdated);
    socket.on(SOCKET_EVENTS.BOOKING_STATUS_CHANGED, handleEventsUpdated);

    return () => {
      socket.off(SOCKET_EVENTS.BOOKING_NEW, handleBookingNew);
      socket.off(SOCKET_EVENTS.EVENTS_UPDATED, handleEventsUpdated);
      socket.off(SOCKET_EVENTS.BOOKING_STATUS_CHANGED, handleEventsUpdated);
    };
  }, [fetchData]);

  const handleAction = async (bookingIds: string[], status: 'approved' | 'rejected') => {
    if (isProcessingAction) return;
    setIsProcessingAction(true);
    try {
      await apiRequest('/api/admin/bookings/bulk-status', {
        method: 'PATCH',
        auth: true,
        body: { ids: bookingIds, status }
      });
      toastSuccess(`Booking(s) ${status} successfully`);
      fetchData();
    } catch (err) {
      console.error(`Failed to ${status} booking(s):`, err);
      toastError(err, `Failed to ${status} booking(s). Please try again.`);
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleSendEmail = async (batchId: string | undefined, eventId: string | undefined) => {
    try {
      await apiRequest('/api/admin/bookings/send-email', {
        method: 'POST',
        auth: true,
        body: { batchId, eventId },
      });
      toastSuccess('Status email sent to the club successfully!');
    } catch (err) {
      console.error('Failed to send email:', err);
      toastError(err, 'Failed to send email. Please try again.');
    }
  };

  const isSameDay = (d1: Date, d2: Date) => {
    return d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate();
  };

  const getEventsForDate = (date: Date) => {
    return calendarEvents.filter(e => {
      const eDate = new Date(e.date);
      return isSameDay(eDate, date) && (e.status === 'approved' || e.status === 'partial');
    });
  };

  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  // Normalize to local midnight so DayPicker's modifier matching works
  const eventDates = React.useMemo(() =>
    calendarEvents.filter(e => e.status === 'approved' || e.status === 'partial').map(e => {
      const d = new Date(e.date);
      return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    }),
    [calendarEvents]
  );

  const calendarEventsWithVenue: CalendarEvent[] = React.useMemo(() =>
    calendarEvents.filter(e => e.status === 'approved' || e.status === 'partial').map(e => {
      // For partial bookings, only show the names of approved venues
      const approvedVenueName = e.status === 'partial'
        ? e.bookings.filter(b => b.status === 'approved').map(b => getVenueName(b.venueId)).join(', ')
        : (e.venueName || e.venueIds.map(getVenueName).join(', '));
      return {
        eventName: e.eventName,
        clubName: e.clubName,
        date: e.date,
        startTime: e.startTime,
        endTime: e.endTime,
        venueName: approvedVenueName || e.venueName || e.venueIds.map(getVenueName).join(', '),
        status: e.status,
      };
    }),
    [calendarEvents, venues]
  );

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-6 sm:space-y-8"
      >
        <div className="min-w-0">
          <h2 className="text-2xl sm:text-3xl font-bold text-textPrimary tracking-tight leading-tight">Admin Dashboard</h2>
        </div>
        <Alert variant="destructive" className="rounded-xl">
          <AlertTriangle size={16} />
          <AlertTitle>Could not load dashboard</AlertTitle>
          <AlertDescription className="mt-1">{error}</AlertDescription>
          <Button variant="outline" size="sm" className="mt-3 gap-2" onClick={fetchData}>
            <RefreshCw size={14} />
            Retry
          </Button>
        </Alert>
      </motion.div>
    );
  }

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-6 sm:space-y-8"
      >
        <div className="space-y-2">
          <Skeleton className="h-10 w-64 sm:w-80" />
          <Skeleton className="h-5 w-80 sm:w-96" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32 sm:h-36 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-[400px] w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="space-y-6 sm:space-y-8"
    >
      {/* Enhanced Header */}
      <div className="px-1 sm:px-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-foreground tracking-tighter leading-tight">Admin Dashboard</h1>
            <p className="text-textSecondary mt-2 sm:mt-3 text-sm sm:text-base font-medium max-w-2xl">Monitor venue bookings, manage approvals, and track system performance.</p>
          </div>
          <div className="flex gap-2 items-center w-full sm:w-auto mt-2 sm:mt-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="gap-2 rounded-xl h-10 font-semibold bg-brand text-white shadow-md hover:opacity-90 w-full sm:w-auto">
                  Quick Actions <ChevronDown size={16} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-56 rounded-xl">
                <DropdownMenuLabel>Manage Platform</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setAddDialogOpen(true)} className="gap-2 cursor-pointer font-medium">
                  <CalendarIcon size={16} className="text-brand" /> Book Venues
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setRegisterDialogOpen(true)} className="gap-2 cursor-pointer font-medium">
                  <Plus size={16} className="text-brand" /> Register Event
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Data & Settings</DropdownMenuLabel>
                <DropdownMenuItem onClick={exportAllEvents} disabled={isLoading} className="gap-2 cursor-pointer font-medium">
                  <Download size={16} className="text-textSecondary" /> Export Events Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSbgSettingsOpen(true)} className="gap-2 cursor-pointer font-medium">
                  <Settings size={16} className="text-textSecondary" /> SBG Settings
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </motion.div>
      </div>

      {/* Mini Stats Grid */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="px-1 sm:px-4"
      >
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 w-full">
          <div className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 bg-card/60 backdrop-blur-sm border border-borderSoft rounded-xl shadow-sm hover:border-warning/40 transition-colors">
            <div className="p-1.5 sm:p-2 bg-warning/10 text-warning rounded-lg shrink-0">
              <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] sm:text-xs text-textMuted font-bold uppercase tracking-wider truncate">Pending</div>
              <div className="text-base sm:text-lg font-extrabold text-textPrimary leading-none mt-0.5">{stats.pending}</div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 bg-card/60 backdrop-blur-sm border border-borderSoft rounded-xl shadow-sm hover:border-brand/40 transition-colors">
            <div className="p-1.5 sm:p-2 bg-brand/10 text-brand rounded-lg shrink-0">
              <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] sm:text-xs text-textMuted font-bold uppercase tracking-wider truncate">Scheduled</div>
              <div className="text-base sm:text-lg font-extrabold text-textPrimary leading-none mt-0.5">{stats.scheduled}</div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 bg-card/60 backdrop-blur-sm border border-borderSoft rounded-xl shadow-sm hover:border-error/40 transition-colors">
            <div className="p-1.5 sm:p-2 bg-error/10 text-error rounded-lg shrink-0">
              <XCircle className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] sm:text-xs text-textMuted font-bold uppercase tracking-wider truncate">Conflicts</div>
              <div className="text-base sm:text-lg font-extrabold text-textPrimary leading-none mt-0.5">{stats.conflicts}</div>
            </div>
          </div>

          <Link to="/admin/clubs" className="block focus-visible:ring-2 focus-visible:ring-success rounded-xl outline-none">
            <div className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 bg-card/60 backdrop-blur-sm border border-borderSoft rounded-xl shadow-sm hover:border-success/40 hover:bg-success/5 transition-all group">
              <div className="p-1.5 sm:p-2 bg-success/10 text-success rounded-lg shrink-0 group-hover:scale-110 transition-transform">
                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] sm:text-xs text-textMuted font-bold uppercase tracking-wider truncate">Clubs</div>
                <div className="text-base sm:text-lg font-extrabold text-textPrimary leading-none mt-0.5 flex items-center gap-1">
                  {stats.activeClubs} <ChevronRight className="w-3 h-3 text-success opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            </div>
          </Link>
        </div>
      </motion.div>

      {/* Calendar Widget */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Card className="border border-borderSoft rounded-xl">
          <CardHeader className="border-b border-borderSoft">
            <CardTitle className="text-lg sm:text-xl">Master Event Calendar</CardTitle>
          </CardHeader>

          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col lg:flex-row gap-6 sm:gap-8">
              {/* Calendar container - centered but spanning more width */}
              <div className="flex-1 flex justify-center lg:justify-start overflow-x-auto p-1 -m-1">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  events={calendarEventsWithVenue}
                  modifiers={{ hasEvents: eventDates }}
                  modifiersClassNames={{
                    hasEvents: "relative after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1.5 after:h-1.5 after:rounded-full after:bg-primary"
                  }}
                  className="rounded-2xl"
                />
              </div>

              {/* Selected Date Details - filling the remaining space */}
              <div className="flex-1 border-t lg:border-t-0 lg:border-l border-borderSoft lg:pl-6 pt-4 lg:pt-0 flex flex-col min-w-0">
                <h4 className="text-sm font-semibold text-textMuted uppercase tracking-wider mb-4">
                  {selectedDate ? selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }) : 'Select a date'}
                </h4>

                <div className="flex-1 overflow-y-auto space-y-3 max-h-[300px]">
                  {selectedDateEvents.length > 0 ? (
                    selectedDateEvents.map((event, index) => (
                      <motion.div
                        key={event.batchId || event.ids[0]}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.2, delay: index * 0.05 }}
                      >
                        <Card className="rounded-xl hover:border-brand/30 transition-colors">
                          <CardContent className="p-3">
                            <div className="flex justify-between items-start">
                              <div className="font-semibold text-textPrimary text-sm mb-1">{event.eventName}</div>
                              <Badge variant={event.status === 'approved' ? 'success' : event.status === 'pending' ? 'pending' : 'destructive'} className="text-[10px] px-1.5 py-0 h-5">
                                {event.status}
                              </Badge>
                            </div>
                            <div className="text-xs text-brand font-medium mt-0.5 mb-2">{event.clubName}</div>
                            {event.permissionsLink && (
                              <a href={event.permissionsLink} target="_blank" rel="noopener noreferrer" className="text-[10px] text-brand hover:underline mb-2 inline-block font-medium">
                                🔗 View Permissions
                              </a>
                            )}
                            <div className="mt-2 text-xs text-textMuted">
                              {event.startTime} - {event.endTime}
                            </div>
                            <div className="mt-1 text-xs text-textMuted">
                              {event.venueName}
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-textMuted text-sm">
                      No events found for this day.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* All Events List (visible to admin) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.45 }}
      >
        <Card className="border border-borderSoft rounded-xl">
          <CardHeader className="border-b border-borderSoft">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg sm:text-xl">All Events</CardTitle>
                <CardDescription className="mt-1">Complete list of bookings visible to admin</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild className="hidden sm:flex whitespace-nowrap border-[1.5px]">
                  <Link to="/admin/requests">View All</Link>
                </Button>
              </div>
            </div>
            <div className="sm:hidden px-4 pt-4 pb-2">
              <Button variant="outline" size="sm" asChild className="w-full border-[1.5px]">
                <Link to="/admin/requests">View All</Link>
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6">
                <Skeleton className="h-12 w-full mb-4" />
                <Skeleton className="h-12 w-full mb-4" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : calendarEvents.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-textMuted">No events available.</p>
              </div>
            ) : (
              <div className="overflow-x-auto w-full">
                <table className="w-full min-w-[600px] sm:min-w-0 text-left text-sm">
                  <thead className="bg-hoverSoft border-b border-borderSoft uppercase tracking-wider text-xs font-semibold text-textMuted">
                    <tr>
                      <th className="px-4 sm:px-6 py-4">Club / Event</th>
                      <th className="px-4 sm:px-6 py-4 hidden sm:table-cell">Venue & Time</th>
                      <th className="px-4 sm:px-6 py-4">Date</th>
                      <th className="px-4 sm:px-6 py-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {calendarEvents.slice(0, 5).map((evt, index) => (
                      <motion.tr
                        key={evt.batchId || evt.ids[0]}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        className="hover:bg-hoverSoft transition-colors"
                      >
                        <td className="px-4 sm:px-6 py-4">
                          <div className="font-semibold text-textPrimary">{evt.eventName}</div>
                          <div className="text-xs text-textMuted mt-0.5">{evt.clubName}</div>
                          {evt.permissionsLink && (
                            <a href={evt.permissionsLink} target="_blank" rel="noopener noreferrer" className="text-[10px] text-brand hover:underline mt-1 inline-block font-medium">
                              🔗 View Permissions
                            </a>
                          )}
                          <div className="text-xs text-textMuted mt-1 sm:hidden">
                            <div className="flex items-center gap-1">
                              <CalendarIcon size={12} /> {evt.startTime} - {evt.endTime}
                            </div>
                            <div>{evt.venueName}</div>
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-4 hidden sm:table-cell">
                          <div className="flex items-center gap-1.5 text-textPrimary">
                            {evt.venueName}
                          </div>
                          <div className="text-xs text-textMuted mt-0.5 flex items-center gap-1">
                            <CalendarIcon size={12} /> {evt.startTime} - {evt.endTime}
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-4">
                          <div className="flex items-center gap-1.5">
                            <CalendarIcon size={14} className="text-textMuted" />
                            {new Date(evt.date).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-4">
                          <Badge
                            variant={
                              evt.status === 'approved' ? 'success' :
                                evt.status === 'rejected' ? 'destructive' :
                                  'pending'
                            }
                          >
                            {evt.status.charAt(0).toUpperCase() + evt.status.slice(1)}
                          </Badge>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Pending Requests Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <Card className="border border-borderSoft rounded-xl">
          <CardHeader className="border-b border-borderSoft">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg sm:text-xl">Pending Requests</CardTitle>
                <CardDescription className="mt-1">Requests requiring immediate attention (Category B or Conflicts)</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild className="hidden sm:flex whitespace-nowrap border-[1.5px]">
                  <Link to="/admin/requests">View All</Link>
                </Button>
              </div>
            </div>
            <div className="sm:hidden px-4 pt-4 pb-2">
              <Button variant="outline" size="sm" asChild className="w-full border-[1.5px]">
                <Link to="/admin/requests">View All</Link>
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="divide-y divide-border/40">
              {isLoading ? (
                <div className="p-4 sm:p-6">
                  <Skeleton className="h-20 w-full" />
                </div>
              ) : pendingRequests.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-textMuted">No pending requests.</p>
                </div>
              ) : (
                pendingRequests.slice(0, 5).map((req, index) => (
                  <motion.div
                    key={req.batchId || req.ids?.[0] || index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className="p-4 sm:p-6 hover:bg-hoverSoft transition-colors"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                          <Badge variant="secondary" className="text-xs">
                            {req.clubName}
                          </Badge>
                          <span className="text-xs text-textMuted">•</span>
                          <span className="text-sm text-textMuted">{new Date(req.date).toLocaleDateString()}</span>
                        </div>
                        <h4 className="text-base sm:text-lg font-medium text-foreground">{req.eventName}</h4>
                        <div className="mt-2 text-sm text-textMuted">
                          <div className="mb-2">Time: {req.startTime} - {req.endTime}</div>
                          <div className="flex flex-col gap-2">
                            {req.bookings.map(booking => (
                              <div key={booking.id} className="flex items-center justify-between bg-background border border-borderSoft rounded-md p-2 text-sm">
                                <span className="font-medium text-foreground">{getVenueName(booking.venueId)}</span>
                                <div className="flex items-center gap-1 sm:gap-2">
                                  <Badge variant={booking.status === 'approved' ? 'success' : booking.status === 'rejected' ? 'destructive' : 'pending'} className="text-[10px] h-5 mr-1">
                                    {booking.status.toUpperCase()}
                                  </Badge>
                                  {booking.status !== 'rejected' && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0 text-textMuted hover:text-error"
                                      onClick={() => handleAction([booking.id], 'rejected')}
                                      title="Reject this venue"
                                      disabled={isProcessingAction}
                                    >
                                      <X size={14} />
                                    </Button>
                                  )}
                                  {booking.status !== 'approved' && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0 text-primary hover:text-primary/80"
                                      onClick={() => handleAction([booking.id], 'approved')}
                                      title="Approve this venue"
                                      disabled={isProcessingAction}
                                    >
                                      <Check size={14} />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        {req.permissionsLink && (
                          <div className="mt-1">
                            <a href={req.permissionsLink} target="_blank" rel="noopener noreferrer" className="text-xs text-brand hover:underline font-medium">
                              🔗 View Permissions
                            </a>
                          </div>
                        )}
                        {req.issueFlag && (
                          <div className="mt-2 text-sm bg-warning/10 text-warning border border-warning/20 p-2 rounded-md flex items-start gap-2">
                            <AlertCircle size={16} className="mt-0.5 shrink-0" />
                            <span>
                              <strong>Requires Admin Approval:</strong> {req.issueFlag}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 sm:gap-3">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-2"
                          onClick={() => handleSendEmail(req.batchId, undefined)} // For dashboard pending requests we only have batchId easily available in req
                          title="Send an email to the club with the current status of all venues in this booking"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
                          <span className="hidden sm:inline">Send Mail</span>
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="flex items-center gap-2"
                          onClick={() => handleAction(req.ids, 'rejected')}
                          disabled={isProcessingAction}
                        >
                          <XCircle size={16} />
                          <span className="hidden sm:inline">Reject</span>
                        </Button>
                        <Button
                          size="sm"
                          className="flex items-center gap-2"
                          onClick={() => handleAction(req.ids, 'approved')}
                          disabled={isProcessingAction}
                        >
                          <CheckCircle size={16} />
                          <span className="hidden sm:inline">Approve</span>
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <AddBookingDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onCreated={fetchData}
      />
      <RegisterEventDialog
        isOpen={registerDialogOpen}
        onOpenChange={setRegisterDialogOpen}
        currentUser={{ role: 'admin' } as any}
        onEventCreated={fetchData}
      />

      {/* SBG Settings Dialog */}
      <Dialog open={sbgSettingsOpen} onOpenChange={setSbgSettingsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>SBG Settings</DialogTitle>
            <DialogDescription>Manage public information shown on the About SBG page.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Constitution Link (URL)</Label>
              <Input
                value={sbgSettings.sbg_constitution_link}
                onChange={e => setSbgSettings({ ...sbgSettings, sbg_constitution_link: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label>SBG LinkedIn (URL)</Label>
              <Input
                value={sbgSettings.sbg_linkedin}
                onChange={e => setSbgSettings({ ...sbgSettings, sbg_linkedin: e.target.value })}
                placeholder="https://linkedin.com/..."
              />
            </div>
            <div className="space-y-2">
              <Label>SBG Contact Email</Label>
              <Input
                value={sbgSettings.sbg_email}
                onChange={e => setSbgSettings({ ...sbgSettings, sbg_email: e.target.value })}
                placeholder="sbg@dau.ac.in"
                type="email"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSbgSettingsOpen(false)}>Cancel</Button>
            <Button
              className="bg-brand text-white hover:bg-brandLink"
              onClick={saveSbgSettings}
              disabled={isSavingSettings}
            >
              {isSavingSettings ? 'Saving...' : 'Save Settings'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default AdminDashboard;