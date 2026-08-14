import { Calendar as CalendarIcon, Plus } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import RegisterEventDialog from '../components/RegisterEventDialog';
import { Button } from '../components/ui/button';
import { apiRequest } from '../lib/api';
import { toastError } from '../lib/toast';
import { formatISTDate, getISTNow, toLocalISOString } from '../lib/utils';
import { AppEvent, User } from '../types';

interface ClubCommitteeProps {
  user: User;
}

const ClubCommittee: React.FC<ClubCommitteeProps> = ({ user }) => {
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const navigate = useNavigate();

  const isCommittee = user.name.toLowerCase().includes('committee');
  const entityType = isCommittee ? 'Committee' : 'Club';

  const todayStr = toLocalISOString(getISTNow());

  const fetchData = async () => {
    try {
      const eventsData = await apiRequest<AppEvent[]>('/api/events', { auth: true });
      setEvents(eventsData);
    } catch (error) {
      toastError(error, 'Failed to fetch data');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-textPrimary tracking-tight flex items-center gap-2 leading-tight">
            <CalendarIcon className="text-brand shrink-0" size={28} />
            <span className="whitespace-normal">{entityType} Events</span>
          </h1>
          <p className="text-textMuted mt-1 text-sm sm:text-base">
            Register and manage your {entityType.toLowerCase()}'s list of events.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => navigate('/members')} variant="outline" className="rounded-xl">
            Edit {entityType} Members
          </Button>
          <Button onClick={() => setIsAddEventOpen(true)} className="rounded-xl bg-brand hover:bg-brand/90 text-white font-semibold">
            <Plus size={16} className="mr-1.5" />
            Register Event
          </Button>
        </div>
      </div>

      <div className="bg-card p-6 rounded-xl border border-borderSoft shadow-sm flex flex-col min-h-[400px]">
        <h3 className="text-lg font-bold text-textPrimary mb-4">Registered Events</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-sm text-textMuted">No registered events yet.</p>
            </div>
          ) : (
            events.map(event => (
              <div key={event.id} className="p-5 rounded-xl border border-borderSoft bg-hoverSoft/20 hover:bg-hoverSoft/40 transition-all flex flex-col justify-between gap-4">
                <div>
                  <h4 className="font-semibold text-base text-textPrimary">{event.name}</h4>
                  <p className="text-xs text-textMuted mt-1">
                    Date: {formatISTDate(event.date, {
                        year: 'numeric', month: 'short', day: 'numeric' })}
                  </p>
                  {event.venue && (
                    <p className="text-xs text-textMuted mt-0.5">
                      Target Venue: {event.venue}
                    </p>
                  )}
                </div>
                <Button 
                  onClick={() => navigate('/book', { 
                    state: { 
                      prefill: { 
                        event_id: event.id,
                        eventName: event.name,
                        date: event.date ? toLocalISOString(new Date(event.date)) : '',
                        venueName: event.venue || ''
                      } 
                    } 
                  })}
                  size="sm"
                  className="w-full text-xs rounded-lg font-semibold bg-brand/10 hover:bg-brand/20 text-brand gap-1"
                >
                  <Plus size={14} />
                  Book Slot
                </Button>
              </div>
            ))
          )}
        </div>
      </div>

      <RegisterEventDialog 
        isOpen={isAddEventOpen} 
        onOpenChange={setIsAddEventOpen} 
        currentUser={user}
        onEventCreated={() => fetchData()}
      />
    </div>
  );
};

export default ClubCommittee;
