import { cn, toLocalISOString } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import {
    AlertTriangle,
    Calendar as CalendarIcon,
    Check,
    CheckCircle2,
    ChevronDown,
    Clock,
    Lock,
    MapPin,
    Plus,
    Users
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import RegisterEventDialog from '../components/RegisterEventDialog';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Calendar } from '../components/ui/calendar';
import { CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Separator } from '../components/ui/separator';
import { TimePicker } from '../components/ui/time-picker';
import { CLUBS, VENUES } from '../constants';
import { apiRequest, type ApiClub, type ApiVenue } from '../lib/api';
import { getErrorMessage } from '../lib/errors';
import { toastError, toastSuccess } from '../lib/toast';
import { AppEvent, ClubGroupType, User } from '../types';

interface BookSlotProps {
  currentUser: User;
}

const BookSlot: React.FC<BookSlotProps> = ({ currentUser }) => {
  const location = useLocation();
  const [clubs, setClubs] = useState<ApiClub[]>([]);
  const [venues, setVenues] = useState<ApiVenue[]>([]);
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [formData, setFormData] = useState({
    expectedAttendees: '',
    clubName: '',
    date: '',
    endDate: '',
    startTime: '12:00',
    endTime: '13:00',
    venueIds: [] as string[],
    event_id: '',
    permissionsLink: '',
    bookingMode: 'event' as 'event' | 'meet',
    title: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [endDatePickerOpen, setEndDatePickerOpen] = useState(false);
  const [selectedEndDate, setSelectedEndDate] = useState<Date | undefined>(undefined);
  const [busyVenueIds, setBusyVenueIds] = useState<string[]>([]);
  const [metaError, setMetaError] = useState<string | null>(null);
  const [bookingType, setBookingType] = useState<'recurring' | 'continuous'>('recurring');

  const [warnings, setWarnings] = useState({
    conflict: '',
    venue: '',
    venueType: '' as 'success' | 'warning' | 'info' | '',
    hours: '',
    timeline: ''
  });

  const [isAddEventOpen, setIsAddEventOpen] = useState(false);

  useEffect(() => {
    if (currentUser && currentUser.role === 'club') {
      setFormData(prev => ({ ...prev, clubName: currentUser.name }));
    }
  }, [currentUser]);

  useEffect(() => {
    const fetchMeta = async () => {
      setMetaError(null);
      try {
        const [clubsData, venuesData, eventsData] = await Promise.all([
          apiRequest<ApiClub[]>('/api/clubs'),
          apiRequest<ApiVenue[]>('/api/venues'),
          apiRequest<AppEvent[]>('/api/events?futureOnly=true', { auth: true }).catch(() => [])
        ]);
        setClubs(clubsData);
        setVenues(venuesData);
        setEvents(
          (eventsData || []).map(e => ({ ...e, id: String(e.id) }))
        );
      } catch (error) {
        console.error('Failed to load clubs/venues:', error);
        setMetaError(getErrorMessage(error, 'Failed to load clubs and venues. Please refresh the page.'));
      }
    };

    fetchMeta();
  }, []);

  // Handle pre-fill from location state (Request Extra Room / Registered Event Link)
  useEffect(() => {
    const prefill = location.state?.prefill;
    if (prefill) {
      setFormData(prev => ({
        ...prev,
        eventName: prefill.eventName || '',
        eventType: prefill.eventType || 'closed_club',
        expectedAttendees: prefill.expectedAttendees || '',
        date: prefill.date ? toLocalISOString(new Date(prefill.date)) : '',
        endDate: prefill.date ? toLocalISOString(new Date(prefill.date)) : '',
        startTime: prefill.startTime || '',
        endTime: prefill.endTime || '',
        clubName: prefill.clubName || prev.clubName,
        event_id: prefill.event_id ? String(prefill.event_id) : ''
      }));

      if (prefill.date) {
        const d = new Date(prefill.date);
        if (!isNaN(d.getTime())) {
          setSelectedDate(d);
          setSelectedEndDate(d);
        }
      }
    }
  }, [location.state]);

  // Handle mapping venueName to venueIds once venues list is loaded
  useEffect(() => {
    const prefill = location.state?.prefill;
    if (prefill && prefill.venueName && venues.length > 0) {
      const matched = venues.find(v => v.name.toLowerCase() === prefill.venueName.toLowerCase());
      if (matched) {
        setFormData(prev => ({
          ...prev,
          venueIds: [matched.id]
        }));
      }
    }
  }, [location.state, venues]);

  // Synchronize eventName with the linked event selection
  useEffect(() => {
    if (formData.event_id && events.length > 0) {
      const selectedEvent = events.find(e => e.id === formData.event_id);
      if (selectedEvent) {
        setFormData(prev => ({
          ...prev,
          eventName: selectedEvent.name
        }));
      }
    }
  }, [formData.event_id, events]);

  // Handle date selection from Calendar
  useEffect(() => {
    if (selectedDate) {
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;

      handleChange('date', dateString);
      setDatePickerOpen(false);

      // Auto-set endDate if it's empty or earlier than startDate
      if (!formData.endDate || new Date(formData.endDate) < selectedDate) {
        handleChange('endDate', dateString);
        setSelectedEndDate(selectedDate);
      }
    }
  }, [selectedDate]);

  // Handle end date selection from Calendar
  useEffect(() => {
    if (selectedEndDate) {
      const year = selectedEndDate.getFullYear();
      const month = String(selectedEndDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedEndDate.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;

      handleChange('endDate', dateString);
      setEndDatePickerOpen(false);
    }
  }, [selectedEndDate]);

  useEffect(() => {
    if (formData.bookingMode === 'meet') {
      setWarnings(prev => ({ ...prev, timeline: '' }));
      return;
    }
    if (!formData.date || !formData.event_id) {
      setWarnings(prev => ({ ...prev, timeline: '' }));
      return;
    }
    const evt = events.find(e => e.id === formData.event_id);
    if (!evt || !evt.event_type) return;

    const eventDate = new Date(formData.date);
    const diffDays = (eventDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);

    let reqDays = 0;
    if (evt.event_type === 'co_curricular') reqDays = 14;
    else if (evt.event_type === 'open_all') reqDays = 20;
    else if (evt.event_type === 'closed_club') reqDays = 0;

    if (diffDays < reqDays) {
      setWarnings(prev => ({
        ...prev,
        timeline: `Short notice booking (${Math.floor(diffDays)} days). Rule: ${reqDays} days advance notice. This booking will trigger the issue flag and require Admin Approval.`
      }));
    } else {
      setWarnings(prev => ({ ...prev, timeline: '' }));
    }
  }, [formData.date, formData.event_id, events]);

  // Parse date string to Date object for Calendar
  useEffect(() => {
    if (formData.date) setSelectedDate(new Date(formData.date));
    if (formData.endDate) setSelectedEndDate(new Date(formData.endDate));
  }, [formData.date, formData.endDate]);

  const getClubGroup = (name: string): ClubGroupType | undefined => {
    if (name === currentUser.name && currentUser.group) {
      return currentUser.group;
    }
    const apiClub = clubs.find(c => c.name === name);
    if (apiClub?.group_category) {
      return apiClub.group_category as ClubGroupType;
    }
    return CLUBS.find(c => c.name === name)?.group;
  };

  const normalizeVenueCategory = (category?: string) => {
    if (!category) return undefined;
    if (category === 'auto_approval') return 'A';
    if (category === 'needs_approval') return 'B';
    return category;
  };

  const getVenueCategory = (id: string) => {
    const apiCategory = venues.find(v => v.id === id)?.category;
    const normalized = normalizeVenueCategory(apiCategory);
    if (normalized) return normalized;
    return VENUES.find(v => v.id === id)?.category;
  };

  // Venue Permission Logic
  useEffect(() => {
    if (formData.venueIds.length === 0) {
      setWarnings(prev => ({ ...prev, venue: '', venueType: '' }));
      return;
    }

    const categories = formData.venueIds.map(id => getVenueCategory(id));
    const hasCategoryB = categories.some(c => c === 'B' || c === 'needs_approval');

    if (hasCategoryB) {
      setWarnings(prev => ({
        ...prev,
        venue: 'Includes Category B Venue(s): Requires SBG Deputy Convener Approval.',
        venueType: 'warning'
      }));
    } else {
      setWarnings(prev => ({
        ...prev,
        venue: 'Category A Venues: Direct booking available (Subject to vacancy).',
        venueType: 'success'
      }));
    }
  }, [formData.venueIds]);

  // Operating Hours Logic
  useEffect(() => {
    const endDates = formData.endDate || formData.date;
    if (!formData.date || !endDates || !formData.startTime || !formData.endTime) {
      setWarnings(prev => ({ ...prev, hours: '' }));
      return;
    }

    const startDate = new Date(formData.date);
    const endDate = new Date(endDates);

    let errorMsg = '';

    if (endDate < startDate) {
      errorMsg = "End date cannot be before start date.";
    } else if (formData.date === endDates && formData.endTime <= formData.startTime) {
      errorMsg = "End time must be after start time on the same day.";
    } else {
      // Validate restricted hours day-by-day (IST)
      const currentDate = new Date(startDate);

      while (currentDate <= endDate) {
        const dayOfWeek = currentDate.getDay();
        const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5; // Monday to Friday

        // Only weekdays have restricted timings (8:00 AM to 7:00 PM IST)
        if (isWeekday) {
          const isFirstDay = currentDate.getTime() === startDate.getTime();
          const isLastDay = currentDate.getTime() === endDate.getTime();

          // Determine the active time block for THIS specific day
          let activeStart = formData.startTime;
          let activeEnd = formData.endTime;

          if (bookingType === 'continuous') {
            activeStart = isFirstDay ? formData.startTime : "00:00";
            activeEnd = isLastDay ? formData.endTime : "24:00";
          }

          // Restricted block is 08:00 to 19:00 (8:00 AM to 7:00 PM IST)
          // Overlap condition: activeStart < RestrictedEnd AND activeEnd > RestrictedStart
          if (activeStart < "19:00" && activeEnd > "08:00") {
            errorMsg = "On weekdays, bookings are not allowed between 8:00 AM and 7:00 PM (IST). Your selection overlaps with these restricted academic hours. (Requires Admin Approval)";
            break;
          }
        }

        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    setWarnings(prev => ({ ...prev, hours: errorMsg }));
  }, [formData.date, formData.endDate, formData.startTime, formData.endTime, bookingType]);

  const generateTimeSlots = () => {
    const endDates = formData.endDate || formData.date;
    if (bookingType === 'continuous') {
      return [{
        startTime: new Date(`${formData.date}T${formData.startTime}:00`).toISOString(),
        endTime: new Date(`${endDates}T${formData.endTime}:00`).toISOString()
      }];
    }

    // recurring
    const slots = [];
    const curr = new Date(formData.date);
    const end = new Date(endDates);
    while (curr <= end) {
      const yyyy = curr.getFullYear();
      const mm = String(curr.getMonth() + 1).padStart(2, '0');
      const dd = String(curr.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;
      slots.push({
        startTime: new Date(`${dateStr}T${formData.startTime}:00`).toISOString(),
        endTime: new Date(`${dateStr}T${formData.endTime}:00`).toISOString()
      });
      curr.setDate(curr.getDate() + 1);
    }
    return slots;
  };

  // Conflict Logic
  useEffect(() => {
    const endDates = formData.endDate || formData.date;
    if (!formData.date || !endDates || !formData.startTime || !formData.endTime || !formData.clubName) {
      return;
    }

    const checkConflicts = async () => {
      try {
        if (venues.length === 0) return;

        const timeSlots = generateTimeSlots();

        const query = new URLSearchParams({
          clubId: clubs.find(c => c.name === formData.clubName)?.id || '',
          venueIds: venues.map(v => v.id).join(','),
        });

        const { hasConflict, message } = await apiRequest<{ hasConflict: boolean; message: string }>(
          `/api/bookings/check-conflict?${query.toString()}`,
          { 
            method: 'POST',
            auth: true,
            body: { timeSlots }
          }
        );

        if (hasConflict) {
          const busyNames = message.split(': ').pop()?.split(', ') || [];
          const busyIds = venues.filter(v => busyNames.includes(v.name)).map(v => v.id);
          setBusyVenueIds(busyIds);
        } else {
          setBusyVenueIds([]);
        }
      } catch (err) {
        console.error('Failed to check conflicts:', err);
      }
    };

    checkConflicts();
  }, [formData.date, formData.endDate, formData.startTime, formData.endTime, formData.clubName, venues, bookingType]);

  const handleChange = (name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Calendar day in IST — event timestamps are TIMESTAMPTZ and naive
  // setHours(0,0,0,0) in the browser TZ can drop same-day / near-day events.
  const istDay = (iso: string) =>
    new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

  // Events a booking may be linked to. Short-notice events are created with
  // status 'pending' (they need admin approval), so they must stay selectable —
  // filtering to 'active' only meant a freshly registered event disappeared from
  // this list while event_id was still set to it, which breaks Radix Select
  // (controlled value with no matching SelectItem → blank / unusable trigger).
  const selectableEvents = React.useMemo(() => {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const filtered = events.filter(e => {
      if (!e?.id) return false;
      if (e.status === 'cancelled' || e.status === 'rejected') return false;
      const endIso = e.dynamic_end_date || e.end_date || e.date;
      if (!endIso) return true;
      return istDay(endIso) >= today;
    });

    // Keep the currently linked event in the list even if date math would
    // exclude it — otherwise Radix has a value with no SelectItem and the
    // dropdown appears broken.
    if (formData.event_id && !filtered.some(e => e.id === formData.event_id)) {
      const selected = events.find(e => e.id === formData.event_id);
      if (selected && selected.status !== 'cancelled' && selected.status !== 'rejected') {
        return [selected, ...filtered];
      }
    }
    return filtered;
  }, [events, formData.event_id]);

  const selectedEvent = selectableEvents.find(e => e.id === formData.event_id);

  // Only clear the link when the event is gone or explicitly not bookable —
  // do not clear for date-filter edge cases (those stay visible above).
  useEffect(() => {
    if (!formData.event_id || events.length === 0) return;
    const linked = events.find(e => e.id === formData.event_id);
    if (!linked || linked.status === 'cancelled' || linked.status === 'rejected') {
      setFormData(prev => ({ ...prev, event_id: '' }));
    }
  }, [formData.event_id, events]);

  const handleVenueToggle = (venueId: string) => {
    if (busyVenueIds.includes(venueId)) return;
    setFormData(prev => {
      const current = prev.venueIds;
      const updated = current.includes(venueId)
        ? current.filter(id => id !== venueId)
        : [...current, venueId];
      return { ...prev, venueIds: updated };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const isSelectedVenueBusy = formData.venueIds.some(id => busyVenueIds.includes(id));
    if (isSelectedVenueBusy) {
      toastError('Please resolve the venue conflict before submitting.');
      return;
    }

    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      const selectedClub = clubs.find(c => c.name === formData.clubName);
      if (!selectedClub) throw new Error("Invalid club selected");

      if (formData.venueIds.length === 0) {
        toastError('Please select at least one venue.');
        return;
      }

      const timeSlots = generateTimeSlots();

      const payload: any = {
        ...formData,
        clubId: selectedClub.id,
        timeSlots,
        expectedAttendees: parseInt(formData.expectedAttendees, 10) || 0
      };

      if (formData.bookingMode === 'meet') {
        delete payload.event_id;
      } else {
        delete payload.title;
      }

      await apiRequest('/api/bookings', {
        method: 'POST',
        auth: true,
        body: payload
      });

      toastSuccess('Booking request submitted successfully!');

      // Clear the form
      setFormData({
        expectedAttendees: '',
        clubName: currentUser?.role === 'club' ? currentUser.name : '',
        date: '',
        endDate: '',
        startTime: '12:00',
        endTime: '13:00',
        venueIds: [],
        event_id: '',
        permissionsLink: '',
        bookingMode: 'event',
        title: ''
      });
      setSelectedDate(undefined);
      setSelectedEndDate(undefined);
      setWarnings({
        conflict: '',
        venue: '',
        venueType: '',
        hours: '',
        timeline: ''
      });

    } catch (error) {
      console.error('Failed to submit booking:', error);
      toastError(error, 'Failed to submit booking. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isSelectedVenueBusy = formData.venueIds.some(id => busyVenueIds.includes(id));
  const hasErrors = isSelectedVenueBusy;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="max-w-5xl mx-auto space-y-6 sm:space-y-8 w-full pb-10"
    >
      {/* Enhanced Header */}
      <div className="text-center space-y-3 sm:space-y-4 mb-8 sm:mb-10">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-brand/8 border border-brand/20 mb-2"
        >
          <CalendarIcon className="w-4 h-4 text-brand mr-2" />
          <span className="text-xs sm:text-sm font-semibold text-brand">Venue Booking System</span>
        </motion.div>

        <motion.h1
          className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tighter text-textPrimary"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          Book Your Venue
        </motion.h1>
        <motion.p
          className="text-textSecondary text-sm sm:text-base max-w-xl mx-auto leading-relaxed"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          Browse availability, select your venue, and secure your booking in minutes.
        </motion.p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="rounded-2xl border border-borderSoft bg-card/80 backdrop-blur-sm overflow-hidden shadow-sm"
      >
        {/* Progress Line */}
        <div className="h-1 w-full bg-borderSoft relative overflow-hidden">
          <motion.div
            className="absolute top-0 left-0 h-full bg-brand"
            initial={{ width: "0%" }}
            animate={{ width: isSubmitting ? "100%" : "35%" }}
            transition={{ duration: 1.5, ease: "circOut" }}
          />
        </div>

        <CardContent className="p-0">
          {metaError && (
            <div className="p-6">
              <Alert variant="destructive">
                <AlertTriangle size={16} />
                <AlertTitle>Unable to load form data</AlertTitle>
                <AlertDescription className="mt-1">{metaError}</AlertDescription>
              </Alert>
            </div>
          )}

          <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-0">

            {/* Sidebar / Left Panel Context Info */}
            <div className="lg:col-span-4 bg-hoverSoft/30 p-5 sm:p-8 space-y-6 sm:space-y-8 lg:border-r border-borderSoft lg:border-b-0 border-b">
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-8 w-1.5 bg-gradient-to-b from-brand to-brandLink rounded-full" />
                  <h3 className="text-lg font-bold text-textPrimary">Key Guidelines</h3>
                </div>
                <div className="space-y-3">
                  <div className="p-4 bg-card rounded-lg border border-borderSoft shadow-sm hover:shadow hover:border-brand/40 transition-all">
                    <div className="flex items-start gap-3">
                      <div className="h-2 w-2 rounded-full bg-brand mt-2 shrink-0" />
                      <div>
                        <span className="font-semibold block text-textPrimary text-sm mb-1">Advance Notice</span>
                        <p className="text-xs text-textSecondary leading-relaxed">Closed club: 1 day. Open: 20 days. Co-curricular: 14 days.</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 bg-card rounded-lg border border-borderSoft shadow-sm hover:shadow hover:border-success/40 transition-all">
                    <div className="flex items-start gap-3">
                      <div className="h-2 w-2 rounded-full bg-success mt-2 shrink-0" />
                      <div>
                        <span className="font-semibold block text-textPrimary text-sm mb-1">Weekend Hours</span>
                        <p className="text-xs text-textSecondary leading-relaxed">8:00 AM – 12:00 AM</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 bg-card rounded-lg border border-borderSoft shadow-sm hover:shadow hover:border-warning/40 transition-all">
                    <div className="flex items-start gap-3">
                      <div className="h-2 w-2 rounded-full bg-warning mt-2 shrink-0" />
                      <div>
                        <span className="font-semibold block text-textPrimary text-sm mb-1">Weekday Hours</span>
                        <p className="text-xs text-textSecondary leading-relaxed">7:00 PM – 12:00 AM</p>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* Booking Preview Section */}
              <div className="pt-6 border-t border-borderSoft/30">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-8 w-1.5 bg-gradient-to-b from-success to-emerald-600 rounded-full" />
                  <h3 className="text-lg font-bold text-textPrimary">Your Selection</h3>
                </div>
                <div className="space-y-3">
                  <div className="p-4 bg-success/5 border border-success/20 rounded-xl space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center text-success">
                        <CalendarIcon size={20} />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-success uppercase tracking-wider">Event Date(s)</p>
                        <p className="text-sm font-bold text-textPrimary">
                          {formData.date ? (
                            <span>
                              {new Date(formData.date).toLocaleDateString('en-US', {
                                  timeZone: 'Asia/Kolkata',
                                month: 'short', day: 'numeric', year: 'numeric', weekday: 'short' })}
                              {formData.endDate && formData.endDate !== formData.date && (
                                <> – {new Date(formData.endDate).toLocaleDateString('en-US', {
                                    timeZone: 'Asia/Kolkata',
                                    month: 'short', day: 'numeric', year: 'numeric', weekday: 'short' })}</>
                              )}
                            </span>
                          ) : 'Not selected'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center text-success">
                        <Clock size={20} />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-success uppercase tracking-wider">Time Range</p>
                        <p className="text-sm font-bold text-textPrimary">
                          {(formData.startTime && formData.endTime) ? `${formData.startTime} – ${formData.endTime}` : 'Pick times'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Form Area - Enhanced */}
            <div className="lg:col-span-8 p-5 sm:p-8 space-y-7 sm:space-y-8">

              {/* Event Info */}
              <section className="space-y-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-8 w-1.5 bg-gradient-to-b from-brand to-brandLink rounded-full" />
                  <h2 className="text-xl sm:text-2xl font-bold text-textPrimary">Event Details</h2>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 mb-6">
                  <Button
                    type="button"
                    variant={formData.bookingMode === 'event' ? 'default' : 'outline'}
                    className={cn("flex-1 justify-start h-auto py-3 px-4", formData.bookingMode === 'event' ? "bg-brand text-white border-transparent" : "border-borderSoft")}
                    onClick={() => handleChange('bookingMode', 'event')}
                  >
                    <div className="text-left whitespace-normal">
                      <div className="font-bold text-sm md:text-base">Formal Event Registration</div>
                      <div className="text-xs font-normal opacity-80 mt-1">Book venues for approved events</div>
                    </div>
                  </Button>
                  <Button
                    type="button"
                    variant={formData.bookingMode === 'meet' ? 'default' : 'outline'}
                    className={cn("flex-1 justify-start h-auto py-3 px-4", formData.bookingMode === 'meet' ? "bg-brand text-white border-transparent" : "border-borderSoft")}
                    onClick={() => handleChange('bookingMode', 'meet')}
                  >
                    <div className="text-left whitespace-normal">
                      <div className="font-bold text-sm md:text-base">Routine Club Meet</div>
                      <div className="text-xs font-normal opacity-80 mt-1">Standalone venue booking (no formal event)</div>
                    </div>
                  </Button>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  {formData.bookingMode === 'event' ? (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="event_id" className="text-textSecondary font-semibold text-sm">Link to Event</Label>
                        <Button
                          onClick={() => setIsAddEventOpen(true)}
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-brand hover:text-brand/80 hover:bg-brand/10 gap-1 rounded-lg font-semibold"
                        >
                          <Plus size={13} />
                          Register Event
                        </Button>
                      </div>
                      <Select
                        value={formData.event_id}
                        onValueChange={(v) => handleChange('event_id', v)}
                      >
                        <SelectTrigger id="event_id" className="h-11 border-borderSoft hover:bg-hoverSoft/50 focus:border-brand focus:ring-4 focus:ring-brand/20 transition-all rounded-xl">
                          <SelectValue placeholder={selectableEvents.length > 0 ? "Select an event…" : "No events registered yet"} />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {selectableEvents.length === 0 ? (
                            <p className="px-3 py-6 text-center text-sm text-textMuted">
                              No upcoming events.<br />
                              <span className="text-xs">Use “Register Event” to create one.</span>
                            </p>
                          ) : (
                            selectableEvents.map(e => (
                              <SelectItem
                                key={e.id}
                                value={String(e.id)}
                                textValue={e.name}
                                className="cursor-pointer"
                                trailing={e.status === 'pending' ? (
                                  <span className="text-[10px] font-bold uppercase tracking-wide text-warning bg-warning/10 border border-warning/30 px-1.5 py-0.5 rounded">
                                    Awaiting approval
                                  </span>
                                ) : undefined}
                              >
                                <span className="font-semibold">{e.name}</span>{' '}
                                <span className="text-textMuted text-xs">
                                  ({new Date(e.date).toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata' })})
                                </span>
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      {selectedEvent?.status === 'pending' && (
                        <p className="text-xs text-warning font-medium flex items-start gap-1.5">
                          <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                          This event is still awaiting admin approval — bookings linked to it stay pending until it is approved.
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      <Label htmlFor="title" className="text-textSecondary font-semibold text-sm">Meet Title *</Label>
                      <Input
                        id="title"
                        placeholder="e.g. Weekly Sync, Core Team Meeting..."
                        value={formData.title}
                        onChange={(e) => handleChange('title', e.target.value)}
                        className="h-11 border-borderSoft focus-visible:ring-brand focus-visible:border-brand rounded-xl shadow-sm"
                      />
                    </div>
                  )}


                  <div className="space-y-2.5">
                    <Label htmlFor="expectedAttendees" className="text-textSecondary font-semibold text-sm">Expected Attendees *</Label>
                    <Select value={formData.expectedAttendees} onValueChange={(v) => handleChange('expectedAttendees', v)}>
                      <SelectTrigger className="h-12 border-borderSoft hover:bg-hoverSoft/50 focus:border-brand focus:ring-4 focus:ring-brand/20 transition-all rounded-xl">
                        <div className="flex items-center gap-2">
                          <Users size={16} className="text-brand" />
                          <SelectValue placeholder="Count" />
                        </div>
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="50">1-50 People</SelectItem>
                        <SelectItem value="100">51-100 People</SelectItem>
                        <SelectItem value="200">101-200 People</SelectItem>
                        <SelectItem value="500">201-500 People</SelectItem>
                        <SelectItem value="500+">500+ People</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </section>

              <Separator className="bg-borderSoft/40" />

              {/* Timing */}
              <section className="space-y-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-8 w-1.5 bg-gradient-to-b from-brand to-brandLink rounded-full" />
                  <h2 className="text-xl sm:text-2xl font-bold text-textPrimary">Date & Time</h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2.5">
                    <Label className="text-textSecondary font-semibold text-sm">From Date *</Label>
                    <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full h-10 justify-start text-left font-medium border-borderSoft hover:bg-hoverSoft/50 transition-all bg-card text-textPrimary rounded-md shadow-sm",
                            !formData.date && "text-textMuted",
                            warnings.timeline && "border-warning/50 ring-1 ring-warning"
                          )}
                          onClick={() => setDatePickerOpen(true)}
                        >
                          <CalendarIcon className="mr-2 h-5 w-5 text-brand opacity-70" />
                          {formData.date ? (
                            <span className="font-semibold">
                              {new Date(formData.date).toLocaleDateString('en-US', {
                                  timeZone: 'Asia/Kolkata',
                                weekday: 'long', year: 'numeric', month: 'short', day: 'numeric'
                              })}
                            </span>
                          ) : (
                            <span>Pick a date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-3" align="start">
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={setSelectedDate}
                          initialFocus
                          disabled={(date) => {
                            // Ensure date is strictly before today in local timezone
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            return date.getTime() < today.getTime();
                          }}
                          defaultMonth={selectedDate || new Date()}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2.5">
                    <Label className="text-textSecondary font-semibold text-sm">To Date *</Label>
                    <Popover open={endDatePickerOpen} onOpenChange={setEndDatePickerOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full h-10 justify-start text-left font-medium border-borderSoft hover:bg-hoverSoft/50 transition-all bg-card text-textPrimary rounded-md shadow-sm",
                            !formData.endDate && "text-textMuted"
                          )}
                          onClick={() => setEndDatePickerOpen(true)}
                        >
                          <CalendarIcon className="mr-2 h-5 w-5 text-brand opacity-70" />
                          {formData.endDate ? (
                            <span className="font-semibold">
                              {new Date(formData.endDate).toLocaleDateString('en-US', {
                                  timeZone: 'Asia/Kolkata',
                                weekday: 'long', year: 'numeric', month: 'short', day: 'numeric'
                              })}
                            </span>
                          ) : (
                            <span>Same as From Date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-3" align="start">
                        <Calendar
                          mode="single"
                          selected={selectedEndDate || selectedDate}
                          onSelect={setSelectedEndDate}
                          disabled={(date) => {
                            if (!selectedDate) {
                              const today = new Date();
                              today.setHours(0, 0, 0, 0);
                              return date.getTime() < today.getTime();
                            }
                            const start = new Date(selectedDate);
                            start.setHours(0, 0, 0, 0);
                            return date.getTime() < start.getTime();
                          }}
                          defaultMonth={selectedEndDate || selectedDate || new Date()}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {formData.date && formData.endDate && formData.date !== formData.endDate && (
                    <div className="sm:col-span-2 p-4 bg-card rounded-xl border border-borderSoft shadow-sm space-y-3 mt-2">
                      <Label className="text-textPrimary font-bold text-sm md:text-base">Multi-Day Booking Type</Label>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <Button
                          type="button"
                          variant={bookingType === 'recurring' ? 'default' : 'outline'}
                          className={cn("flex-1 justify-start h-auto py-3 px-4", bookingType === 'recurring' ? "bg-brand text-white border-transparent" : "border-borderSoft")}
                          onClick={() => setBookingType('recurring')}
                        >
                          <div className="text-left whitespace-normal">
                            <div className="font-bold text-sm md:text-base">Recurring Daily</div>
                            <div className="text-xs font-normal opacity-80 mt-1">Book specific hours each day</div>
                          </div>
                        </Button>
                        <Button
                          type="button"
                          variant={bookingType === 'continuous' ? 'default' : 'outline'}
                          className={cn("flex-1 justify-start h-auto py-3 px-4", bookingType === 'continuous' ? "bg-brand text-white border-transparent" : "border-borderSoft")}
                          onClick={() => setBookingType('continuous')}
                        >
                          <div className="text-left whitespace-normal">
                            <div className="font-bold text-sm md:text-base">Continuous</div>
                            <div className="text-xs font-normal opacity-80 mt-1">Book continuously from start to end</div>
                          </div>
                        </Button>
                      </div>
                    </div>
                  )}

                  {(warnings.timeline) && (
                    <div className="sm:col-span-2">
                      <p className="text-xs text-warning font-semibold flex items-center gap-1.5 bg-warning/10 p-2.5 rounded-lg border border-warning/30">
                        <AlertTriangle size={14} className="shrink-0" /> {warnings.timeline}
                      </p>
                    </div>
                  )}

                  <div className="space-y-2.5">
                    <Label className="text-textSecondary font-semibold text-sm">Start Time *</Label>
                    <TimePicker
                      value={formData.startTime}
                      onChange={(v) => handleChange('startTime', v)}
                      className={cn("h-10 rounded-md", warnings.hours && "border-error transition-all")}
                    />
                  </div>

                  <div className="space-y-2.5">
                    <Label className="text-textSecondary font-semibold text-sm">End Time *</Label>
                    <TimePicker
                      value={formData.endTime}
                      onChange={(v) => handleChange('endTime', v)}
                      className={cn("h-10 rounded-md", warnings.hours && "border-error transition-all")}
                    />
                  </div>

                  {(warnings.hours) && (
                    <div className="sm:col-span-2 space-y-3">
                      {warnings.hours && (
                        <Alert className="bg-error/5 border-2 border-error/30 text-error rounded-xl">
                          <AlertTriangle size={16} className="shrink-0" />
                          <AlertDescription className="font-semibold ml-2">{warnings.hours}</AlertDescription>
                        </Alert>
                      )}
                    </div>
                  )}
                </div>
              </section>

              <Separator className="bg-borderSoft/40" />

              {/* Venues */}
              <section className="space-y-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-8 w-1.5 bg-gradient-to-b from-brand to-brandLink rounded-full" />
                  <h2 className="text-xl sm:text-2xl font-bold text-textPrimary">Select Venue</h2>
                </div>

                <div className="space-y-3">
                  <Label className="text-textSecondary font-semibold text-sm">Venues *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className={cn(
                          "w-full h-11 justify-between border-borderSoft hover:bg-hoverSoft/50 transition-all bg-card text-textPrimary rounded-xl shadow-sm font-bold text-sm",
                          formData.venueIds.length === 0 && "text-textMuted"
                        )}
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <MapPin size={18} className="text-brand shrink-0" />
                          <span className="truncate">
                            {formData.venueIds.length > 0
                              ? `${formData.venueIds.length} venue${formData.venueIds.length !== 1 ? 's' : ''} selected`
                              : "Choose venues..."}
                          </span>
                        </div>
                        <ChevronDown className="h-5 w-5 opacity-40 shrink-0" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-[var(--radix-popover-trigger-width)] p-0 rounded-xl shadow-2xl border-borderSoft"
                      align="start"
                    >
                      <div className="max-h-[220px] overflow-y-auto space-y-0.5 p-1 relative">
                        {/* Category A Venues */}
                        <div className="px-2 py-1 mb-1 mt-1">
                          <div className="text-[11px] font-black text-brand uppercase tracking-widest flex items-center gap-2">
                            <div className="h-1.5 w-1.5 rounded-full bg-brand" />
                            Standard Venues
                          </div>
                        </div>

                        {venues.filter(v => normalizeVenueCategory(v.category) === 'A').length === 0 ? (
                          <div className="px-3 py-4 text-center text-xs font-semibold text-textMuted/60 uppercase tracking-widest">No Category A venues</div>
                        ) : (
                          venues.filter(v => normalizeVenueCategory(v.category) === 'A').map(v => (
                            <div
                              key={v.id}
                              role="checkbox"
                              aria-checked={formData.venueIds.includes(v.id)}
                              tabIndex={0}
                              onKeyDown={(e) => { if(e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleVenueToggle(v.id); } }}
                              className="flex items-center space-x-3 px-3 py-2.5 hover:bg-brand/5 rounded-lg cursor-pointer transition-all group mx-1"
                              onClick={() => handleVenueToggle(v.id)}
                            >
                              <div className={cn(
                                "h-4 w-4 border rounded-md flex items-center justify-center transition-all shrink-0",
                                formData.venueIds.includes(v.id)
                                  ? "bg-brand border-brand text-white shadow-sm"
                                  : "border-textMuted/40 bg-transparent group-hover:border-brand/50"
                              )}>
                                {formData.venueIds.includes(v.id) && <Check className="h-3 w-3" />}
                              </div>
                              <span className={cn(
                                "text-sm font-bold flex-1 transition-colors truncate",
                                busyVenueIds.includes(v.id) ? "text-textMuted/50 italic font-medium" : "text-textPrimary group-hover:text-brand"
                              )}>
                                {v.name}
                              </span>
                              {busyVenueIds.includes(v.id) ? (
                                <span className="text-[10px] font-black text-error uppercase tracking-tighter ml-2">Busy</span>
                              ) : (
                                <span className="text-[9px] font-bold bg-brand/10 border border-brand/20 text-brand px-1.5 py-0.5 rounded uppercase ml-2">Cat A</span>
                              )}
                            </div>
                          ))
                        )}

                        {/* Category B Venues */}
                        <div className="px-2 py-1 mt-3 mb-1">
                          <div className="text-[11px] font-black text-warning uppercase tracking-widest flex items-center gap-2">
                            <div className="h-1.5 w-1.5 rounded-full bg-warning" />
                            Restricted Venues
                          </div>
                        </div>

                        {venues.filter(v => normalizeVenueCategory(v.category) === 'B').length === 0 ? (
                          <div className="px-3 py-4 text-center text-xs font-semibold text-textMuted/60 uppercase tracking-widest">No Category B venues</div>
                        ) : (
                          venues.filter(v => normalizeVenueCategory(v.category) === 'B').map(v => (
                            <div
                              key={v.id}
                              role="checkbox"
                              aria-checked={formData.venueIds.includes(v.id)}
                              tabIndex={0}
                              onKeyDown={(e) => { if(e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleVenueToggle(v.id); } }}
                              className="flex items-center space-x-3 px-3 py-2.5 hover:bg-warning/5 rounded-lg cursor-pointer transition-all group mx-1"
                              onClick={() => handleVenueToggle(v.id)}
                            >
                              <div className={cn(
                                "h-4 w-4 border rounded-md flex items-center justify-center transition-all shrink-0",
                                formData.venueIds.includes(v.id)
                                  ? "bg-warning border-warning text-white shadow-sm"
                                  : "border-textMuted/40 bg-transparent group-hover:border-warning/50"
                              )}>
                                {formData.venueIds.includes(v.id) && <Check className="h-3 w-3" />}
                              </div>
                              <span className={cn(
                                "text-sm font-bold flex-1 transition-colors truncate",
                                busyVenueIds.includes(v.id) ? "text-textMuted/50 italic font-medium" : "text-textPrimary group-hover:text-warning"
                              )}>
                                {v.name}
                              </span>
                              {busyVenueIds.includes(v.id) ? (
                                <span className="text-[10px] font-black text-error uppercase tracking-tighter ml-2">Busy</span>
                              ) : (
                                <div className="flex items-center gap-1 bg-warning/10 border border-warning/20 px-1.5 py-0.5 rounded ml-2">
                                  <span className="text-[9px] font-bold text-warning uppercase">Cat B</span>
                                  <Lock size={10} className="text-warning opacity-80" />
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>

                  {/* Selected Venues Badges */}
                  <div className="flex flex-wrap gap-2 min-h-[36px]">
                    <AnimatePresence>
                      {formData.venueIds.map(id => {
                        const v = venues.find(v => v.id === id);
                        if (!v) return null;
                        const isCatB = normalizeVenueCategory(v.category) === 'B';
                        return (
                          <motion.div
                            key={id}
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 300, damping: 25 }}
                          >
                            <Badge
                              className={cn(
                                "pl-3 pr-1.5 py-1.5 flex items-center gap-1.5 font-semibold shadow-md",
                                isCatB
                                  ? "bg-warning/15 text-warning border-warning/30 hover:bg-warning/25"
                                  : "bg-brand/15 text-brand border-brand/30 hover:bg-brand/25"
                              )}
                            >
                              {v.name}
                              <button
                                type="button"
                                aria-label="Remove venue"
                                onClick={() => handleVenueToggle(id)}
                                className={cn(
                                  "ml-0.5 hover:bg-current/20 rounded-full p-0.5 transition-all hover:scale-110"
                                )}
                              >
                                <span className="font-bold text-lg">×</span>
                              </button>
                            </Badge>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>

                  {/* Venue Info Alert */}
                  {warnings.venue && (
                    <Alert
                      className={cn(
                        "rounded-xl border-2 mt-3",
                        warnings.venueType === 'warning'
                          ? "border-warning/30 bg-warning/5"
                          : "border-success/30 bg-success/5"
                      )}
                    >
                      {warnings.venueType === 'warning' ? (
                        <AlertTriangle size={18} className="text-warning shrink-0" />
                      ) : (
                        <CheckCircle2 size={18} className="text-success shrink-0" />
                      )}
                      <AlertDescription className={cn(
                        "font-semibold ml-3",
                        warnings.venueType === 'warning' ? "text-warning" : "text-success"
                      )}>
                        {warnings.venue}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </section>

              <Separator className="bg-borderSoft/40" />

              {/* Permissions */}
              <section className="space-y-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-8 w-1.5 bg-gradient-to-b from-brand to-brandLink rounded-full" />
                  <h2 className="text-xl sm:text-2xl font-bold text-textPrimary">List of Permissions (if any)</h2>
                </div>
                <div className="space-y-2.5">
                  <Label htmlFor="permissionsLink" className="text-textSecondary font-semibold text-sm">Drive Link to Document (Optional)</Label>
                  <Input
                    id="permissionsLink"
                    type="url"
                    placeholder="https://docs.google.com/..."
                    value={formData.permissionsLink}
                    onChange={(e) => handleChange('permissionsLink', e.target.value)}
                    className="h-11 border-borderSoft focus-visible:ring-brand focus-visible:border-brand rounded-xl shadow-sm"
                  />
                  <p className="text-xs text-textMuted mt-1">If your event requires specific permissions (e.g. from faculty or administration), provide a link to the document here.</p>
                </div>
              </section>

              {/* Submit Area */}
              <div className="pt-8 border-t border-borderSoft/40">
                <Button
                  type="submit"
                  disabled={hasErrors || isSubmitting || !formData.date || !formData.startTime || !formData.endTime || formData.venueIds.length === 0 || (formData.bookingMode === 'event' ? !formData.event_id : !formData.title)}
                  className={cn(
                    "w-full h-12 text-base font-bold rounded-lg shadow-sm transition-transform flex items-center justify-center gap-2",
                    hasErrors || isSubmitting || !formData.date || !formData.startTime || !formData.endTime || formData.venueIds.length === 0 || (formData.bookingMode === 'event' ? !formData.event_id : !formData.title)
                      ? "bg-borderSoft text-textMuted cursor-not-allowed"
                      : "bg-brand text-bgMain hover:scale-[1.02] active:scale-[0.98]"
                  )}
                >
                  {isSubmitting ? (
                    <>
                      <div className="h-5 w-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Submitting Booking...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={20} />
                      <span>Confirm Booking</span>
                    </>
                  )}
                </Button>
                {hasErrors && (
                  <p className="text-center text-error text-sm mt-4 font-semibold bg-error/5 p-3 rounded-lg border border-error/20">
                    ⚠️ Please resolve the warnings above to proceed.
                  </p>
                )}
                {!formData.date || !formData.startTime || !formData.endTime || formData.venueIds.length === 0 || (formData.bookingMode === 'event' ? !formData.event_id : !formData.title) ? (
                  <p className="text-center text-textMuted text-sm mt-4 font-medium">
                    📝 Please fill in all required fields to submit.
                  </p>
                ) : null}
              </div>

            </div>
          </form>
        </CardContent>
      </motion.div>

      <RegisterEventDialog
        isOpen={isAddEventOpen}
        onOpenChange={setIsAddEventOpen}
        currentUser={currentUser}
        onEventCreated={(createdEvent) => {
          const id = String(createdEvent.id);
          setEvents(prev => {
            const without = prev.filter(e => e.id !== id);
            return [{ ...createdEvent, id }, ...without];
          });
          setFormData(prev => ({ ...prev, event_id: id }));
        }}
      />
    </motion.div>
  );
};

export default BookSlot;