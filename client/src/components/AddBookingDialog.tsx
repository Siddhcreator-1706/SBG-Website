import { cn } from '@/lib/utils';
import { Loader2, Plus } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { apiRequest, ApiVenue } from '../lib/api';
import { Button } from './ui/button';
import { DatePicker } from './ui/date-picker';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from './ui/select';
import { TimePicker } from './ui/time-picker';

type Club = {
    id: string;
    name: string;
};

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCreated: () => void;
};

const EVENT_TYPES = [
    { value: 'co_curricular', label: 'Co-Curricular' },
    { value: 'open_all', label: 'Open for All' },
    { value: 'closed_club', label: 'Closed Club' },
];

const AddBookingDialog: React.FC<Props> = ({ open, onOpenChange, onCreated }) => {
    const [eventName, setEventName] = useState('');
    const [selectedClubId, setSelectedClubId] = useState<string | null>(null);
    const [allClubs, setAllClubs] = useState<Club[]>([]);
    const [selectedVenues, setSelectedVenues] = useState<string[]>([]);
    const [startDate, setStartDate] = useState<Date | undefined>(undefined);
    const [endDate, setEndDate] = useState<Date | undefined>(undefined);
    const [startTime, setStartTime] = useState('12:00');
    const [endTime, setEndTime] = useState('13:00');
    const [eventType, setEventType] = useState('');
    const [expectedAttendees, setExpectedAttendees] = useState('');
    const [bookingType, setBookingType] = useState<'recurring' | 'continuous'>('recurring');
    
    const [clubEvents, setClubEvents] = useState<any[]>([]);
    const [selectedEventId, setSelectedEventId] = useState('');

    const [venues, setVenues] = useState<ApiVenue[]>([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [coCurricularWarning, setCoCurricularWarning] = useState('');

    // Load venues and clubs
    useEffect(() => {
        if (open) {
            apiRequest<ApiVenue[]>('/api/venues')
                .then(setVenues)
                .catch(() => setVenues([]));
            // Auto-resolve SBG club
            apiRequest<Club[]>('/api/clubs')
                .then((clubs) => {
                    setAllClubs(clubs);
                    const sbg = clubs.find((c) =>
                        c.name.toLowerCase().includes('sbg') ||
                        c.name.toLowerCase().includes('student body')
                    );
                    const clubId = sbg?.id || clubs[0]?.id || null;
                    setSelectedClubId(clubId);
                })
                .catch(() => {
                    setSelectedClubId(null);
                    setAllClubs([]);
                });
        }
    }, [open]);

    // Fetch events when club changes
    useEffect(() => {
        if (selectedClubId) {
            apiRequest<any[]>(`/api/admin/clubs/${selectedClubId}/events`, { auth: true })
                .then(setClubEvents)
                .catch(() => setClubEvents([]));
        } else {
            setClubEvents([]);
        }
    }, [selectedClubId]);

    // Reset form when opened
    useEffect(() => {
        if (open) {
            setEventName('');
            setSelectedVenues([]);
            setStartDate(undefined);
            setEndDate(undefined);
            setStartTime('12:00');
            setEndTime('13:00');
            setEventType('');
            setExpectedAttendees('');
            setSelectedEventId('');
            setError(null);
            setCoCurricularWarning('');
            setBookingType('recurring');
        }
    }, [open]);

    // Sync eventType with selected event
    useEffect(() => {
        if (selectedEventId) {
            const evt = clubEvents.find(e => e.id === selectedEventId);
            if (evt && evt.event_type) {
                setEventType(evt.event_type);
            }
        }
    }, [selectedEventId, clubEvents]);

    // Co-curricular limit check
    useEffect(() => {
        if (eventType !== 'co_curricular' || !selectedClubId) {
            setCoCurricularWarning('');
            return;
        }

        apiRequest<{ count: number; limit: number }>(
            `/api/bookings/co-curricular-count?clubId=${selectedClubId}`,
            { auth: true }
        )
            .then(({ count, limit }) => {
                if (count >= limit) {
                    setCoCurricularWarning(
                        `This club has already booked ${limit} co-curricular events this semester. (Admin Override Active - You can still book)`
                    );
                } else if (count === limit - 1) {
                    setCoCurricularWarning(
                        `Warning: This will be the last co-curricular event allowed this semester (${count}/${limit} used).`
                    );
                } else {
                    setCoCurricularWarning('');
                }
            })
            .catch(() => setCoCurricularWarning(''));
    }, [eventType, selectedClubId]);

    const toggleVenue = (venueId: string) => {
        setSelectedVenues((prev) =>
            prev.includes(venueId)
                ? prev.filter((v) => v !== venueId)
                : [...prev, venueId]
        );
    };

    const handleCreate = async () => {
        if (!selectedClubId) {
            setError('Please select an organizing club.');
            return;
        }
        if (!selectedEventId) {
            setError('Please select an existing event');
            return;
        }
        if (selectedVenues.length === 0) {
            setError('Please select at least one venue');
            return;
        }
        if (!startDate || !endDate || !startTime || !endTime) {
            setError('Start Date, End Date, start time, and end time are required');
            return;
        }

        setSaving(true);
        setError(null);

        try {
            const generateTimeSlots = () => {
                if (bookingType === 'continuous') {
                    const sYear = startDate.getFullYear();
                    const sMonth = String(startDate.getMonth() + 1).padStart(2, '0');
                    const sDay = String(startDate.getDate()).padStart(2, '0');
                    const sDateString = `${sYear}-${sMonth}-${sDay}`;
        
                    const activeEndDate = endDate;
                    const eYear = activeEndDate.getFullYear();
                    const eMonth = String(activeEndDate.getMonth() + 1).padStart(2, '0');
                    const eDay = String(activeEndDate.getDate()).padStart(2, '0');
                    const eDateString = `${eYear}-${eMonth}-${eDay}`;

                    return [{
                        startTime: new Date(`${sDateString}T${startTime}:00`).toISOString(),
                        endTime: new Date(`${eDateString}T${endTime}:00`).toISOString()
                    }];
                }
                
                const slots = [];
                const curr = new Date(startDate);
                curr.setHours(0,0,0,0);
                const end = new Date(endDate);
                end.setHours(0,0,0,0);
                while (curr <= end) {
                    const yyyy = curr.getFullYear();
                    const mm = String(curr.getMonth() + 1).padStart(2, '0');
                    const dd = String(curr.getDate()).padStart(2, '0');
                    const dateStr = `${yyyy}-${mm}-${dd}`;
                    slots.push({
                        startTime: new Date(`${dateStr}T${startTime}:00`).toISOString(),
                        endTime: new Date(`${dateStr}T${endTime}:00`).toISOString()
                    });
                    curr.setDate(curr.getDate() + 1);
                }
                return slots;
            };

            const timeSlots = generateTimeSlots();

            await apiRequest('/api/admin/bookings', {
                method: 'POST',
                auth: true,
                body: {
                    club_id: selectedClubId,
                    venue_ids: selectedVenues,
                    event_id: selectedEventId,
                    timeSlots,
                    expected_attendees: expectedAttendees
                        ? parseInt(expectedAttendees)
                        : undefined,
                },
            });
            onCreated();
            onOpenChange(false);
        } catch (err: any) {
            setError(err?.message || 'Failed to register/book');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[550px] max-h-[90dvh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Book Venues</DialogTitle>
                    <DialogDescription>
                        Book venues for an existing event.
                    </DialogDescription>
                </DialogHeader>

                {error && (
                    <div className="text-sm text-error bg-error/10 border border-error/20 rounded-md px-3 py-2">
                        {error}
                    </div>
                )}

                <div className="grid gap-4 py-2">
                    {/* Club Selection */}
                    <div className="grid gap-2">
                        <Label>Organizing Club</Label>
                        <Select value={selectedClubId || ''} onValueChange={setSelectedClubId}>
                            <SelectTrigger className="bg-card border-borderSoft">
                                <SelectValue placeholder="Select club..." />
                            </SelectTrigger>
                            <SelectContent>
                                {allClubs.map(c => (
                                    <SelectItem key={c.id} value={c.id}>
                                        {c.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-2">
                        <Label>Select Event</Label>
                        <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                            <SelectTrigger className="bg-card">
                                <SelectValue placeholder="Select an event" />
                            </SelectTrigger>
                            <SelectContent>
                                {clubEvents.map((evt) => (
                                    <SelectItem key={evt.id} value={evt.id}>
                                        {evt.name}
                                    </SelectItem>
                                ))}
                                {clubEvents.length === 0 && (
                                    <div className="px-2 py-3 text-sm text-textMuted text-center">No events found for this club</div>
                                )}
                            </SelectContent>
                        </Select>
                    </div>


                    {/* Venues */}
                    <div className="grid gap-2">
                        <Label>Venues</Label>
                        <div className="max-h-36 overflow-y-auto rounded-md border border-borderSoft p-2 space-y-1 bg-card">
                            {venues.length === 0 ? (
                                <p className="text-xs text-textMuted py-2 text-center">Loading venues...</p>
                            ) : (
                                venues.map((v) => (
                                    <label
                                        key={v.id}
                                        className={`
                                            flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-sm transition-colors
                                            ${selectedVenues.includes(v.id)
                                                ? 'bg-brand/10 text-brand font-medium'
                                                : 'hover:bg-hoverSoft text-textPrimary'
                                            }
                                        `}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedVenues.includes(v.id)}
                                            onChange={() => toggleVenue(v.id)}
                                            className="accent-[var(--brand)] rounded"
                                        />
                                        {v.name}
                                        {v.capacity && (
                                            <span className="text-xs text-textMuted ml-auto">
                                                Cap: {v.capacity}
                                            </span>
                                        )}
                                    </label>
                                ))
                            )}
                        </div>
                        {selectedVenues.length > 0 && (
                            <p className="text-xs text-textMuted">
                                {selectedVenues.length} venue{selectedVenues.length > 1 ? 's' : ''} selected
                            </p>
                        )}
                    </div>

                    {/* Date / Time */}
                    <div className="grid gap-2">
                        <Label>Schedule</Label>
                        <div className="grid gap-3 p-3 rounded-md border border-borderSoft bg-card">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs text-textSecondary">Start Date</Label>
                                        <DatePicker
                                            date={startDate}
                                            setDate={setStartDate}
                                            className="bg-card w-full"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs text-textSecondary">End Date</Label>
                                        <DatePicker
                                            date={endDate}
                                            setDate={setEndDate}
                                            className="bg-card w-full"
                                        />
                                    </div>
                                </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs text-textSecondary">Start Time</Label>
                                    <TimePicker
                                        value={startTime}
                                        onChange={setStartTime}
                                        className="h-10 rounded-md"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs text-textSecondary">End Time</Label>
                                    <TimePicker
                                        value={endTime}
                                        onChange={setEndTime}
                                        className="h-10 rounded-md"
                                    />
                                </div>
                            </div>
                            
                            {startDate && endDate && startDate.getTime() !== endDate.getTime() && (
                                <div className="pt-3 border-t border-borderSoft mt-2">
                                    <Label className="text-textPrimary font-bold text-sm md:text-base mb-3 block">Multi-Day Booking Type</Label>
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
                        </div>
                    </div>


                    {coCurricularWarning && (
                        <div className={`text-sm rounded-md px-3 py-2 border ${coCurricularWarning.startsWith('SBG has already')
                            ? 'text-error bg-error/10 border-error/20'
                            : 'text-warning bg-warning/10 border-warning/20'
                            }`}>
                            {coCurricularWarning}
                        </div>
                    )}

                    {/* Expected Attendees */}
                    <div className="grid gap-2">
                        <Label htmlFor="add-attendees">Expected Attendees</Label>
                        <Input
                            id="add-attendees"
                            type="number"
                            value={expectedAttendees}
                            onChange={(e) => setExpectedAttendees(e.target.value)}
                            placeholder="e.g. 100 (optional)"
                            className="bg-card"
                        />
                    </div>

                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={saving}
                    >
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleCreate} 
                        disabled={
                            saving || 
                            !selectedClubId || 
                            !selectedEventId || 
                            selectedVenues.length === 0 || 
                            !startDate || 
                            !endDate || 
                            !startTime || 
                            !endTime || 
                            (startDate?.getTime() === endDate?.getTime() && endTime <= startTime)
                        } 
                        className="gap-2 bg-brand text-bgMain disabled:opacity-50"
                    >
                        {saving ? (
                            <Loader2 size={14} className="animate-spin" />
                        ) : (
                            <Plus size={14} />
                        )}
                        Book Venues
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default AddBookingDialog;