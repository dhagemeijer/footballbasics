import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Navigate } from 'react-router-dom';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, CalendarIcon, ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

const LOCATIONS = [
  { value: 'Forum Sport', label: 'Forum Sport' },
  { value: 'woensdag veld 1', label: 'Woensdag veld 1' },
  { value: 'zondag veld 2', label: 'Zondag veld 2' },
];

const DEFAULT_FOCUS = 'Balcontrole & traptechniek';

export default function AdminTrainingsPage() {
  const { user, isTrainerOrAdmin, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<string | null>(null);
  
  // Form state
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState('19:00');
  const [selectedLocation, setSelectedLocation] = useState('Forum Sport');
  const [focus, setFocus] = useState(DEFAULT_FOCUS);

  // Fetch training sessions
  const { data: sessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ['admin-training-sessions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_sessions')
        .select('*')
        .order('session_date', { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });

  // Create training session mutation
  const createMutation = useMutation({
    mutationFn: async (newSession: {
      session_date: string;
      session_time: string;
      location: string;
      title: string;
      description: string;
    }) => {
      const { error } = await supabase.from('training_sessions').insert({
        ...newSession,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-training-sessions'] });
      toast({ title: 'Training aangemaakt', description: 'De training is succesvol toegevoegd.' });
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast({ title: 'Fout', description: error.message, variant: 'destructive' });
    },
  });

  // Delete training session mutation
  const deleteMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await supabase.from('training_sessions').delete().eq('id', sessionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-training-sessions'] });
      toast({ title: 'Training verwijderd', description: 'De training is succesvol verwijderd.' });
    },
    onError: (error) => {
      toast({ title: 'Fout', description: error.message, variant: 'destructive' });
    },
  });

  const resetForm = () => {
    setSelectedDate(undefined);
    setSelectedTime('19:00');
    setSelectedLocation('Forum Sport');
    setFocus(DEFAULT_FOCUS);
    setEditingSession(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedDate) {
      toast({ title: 'Fout', description: 'Selecteer een datum', variant: 'destructive' });
      return;
    }

    createMutation.mutate({
      session_date: format(selectedDate, 'yyyy-MM-dd'),
      session_time: selectedTime,
      location: selectedLocation,
      title: `Training ${format(selectedDate, 'EEEE d MMMM', { locale: nl })}`,
      description: focus,
    });
  };

  const handleDelete = (sessionId: string) => {
    if (confirm('Weet je zeker dat je deze training wilt verwijderen?')) {
      deleteMutation.mutate(sessionId);
    }
  };

  if (authLoading) {
    return (
      <Layout>
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!isTrainerOrAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-6">
          <Link to="/admin">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Trainingen Beheren</h1>
            <p className="text-muted-foreground">Plan en beheer trainingen</p>
          </div>
        </div>

        <div className="flex justify-end mb-6">
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Nieuwe Training
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Nieuwe Training Toevoegen</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Datum</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !selectedDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? format(selectedDate, "EEEE d MMMM yyyy", { locale: nl }) : "Selecteer datum"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="time">Tijd</Label>
                  <Input
                    id="time"
                    type="time"
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Locatie</Label>
                  <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecteer locatie" />
                    </SelectTrigger>
                    <SelectContent>
                      {LOCATIONS.map((loc) => (
                        <SelectItem key={loc.value} value={loc.value}>
                          {loc.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="focus">Focus van de training</Label>
                  <Textarea
                    id="focus"
                    value={focus}
                    onChange={(e) => setFocus(e.target.value.slice(0, 200))}
                    placeholder="Bijv. Balcontrole & traptechniek"
                    maxLength={200}
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground text-right">{focus.length}/200</p>
                </div>

                <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                  {createMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Plus className="w-4 h-4 mr-2" />
                  )}
                  Training Toevoegen
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Geplande Trainingen</CardTitle>
          </CardHeader>
          <CardContent>
            {sessionsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : sessions && sessions.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Datum</TableHead>
                    <TableHead>Tijd</TableHead>
                    <TableHead>Locatie</TableHead>
                    <TableHead>Focus</TableHead>
                    <TableHead className="text-right">Acties</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell>
                        {format(new Date(session.session_date), "EEEE d MMMM", { locale: nl })}
                      </TableCell>
                      <TableCell>{session.session_time.slice(0, 5)}</TableCell>
                      <TableCell>{(session as any).location || 'Forum Sport'}</TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {session.description || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(session.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Nog geen trainingen gepland. Klik op "Nieuwe Training" om te beginnen.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
