import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Navigate } from 'react-router-dom';
import { format, parseISO, startOfDay, isBefore, isAfter, isSameDay, setHours } from 'date-fns';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, CalendarIcon, ArrowLeft, Trash2, CheckCircle, Pencil, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Link } from 'react-router-dom';

interface TrainingSession {
  id: string;
  title: string;
  description: string | null;
  session_date: string;
  session_time: string;
  location: string | null;
  max_participants: number | null;
  is_completed: boolean;
  created_by: string | null;
  created_at: string | null;
}

const classifySession = (session: TrainingSession): 'planned' | 'completed' => {
  const now = new Date();
  const today = startOfDay(now);
  const sessionDay = startOfDay(parseISO(session.session_date));

  if (isBefore(sessionDay, today)) return 'completed';
  if (isAfter(sessionDay, today)) return 'planned';

  const cutoff = setHours(today, 22);
  return now >= cutoff ? 'completed' : 'planned';
};

const LOCATIONS = [
  { value: 'Forum Sport - veld 1', label: 'Forum Sport - veld 1' },
  { value: 'Forum Sport - veld 2', label: 'Forum Sport - veld 2' },
  { value: 'Forum Sport - veld 3', label: 'Forum Sport - veld 3' },
  { value: 'Forum Sport - veld 4', label: 'Forum Sport - veld 4' },
];

const DEFAULT_FOCUS = 'Balcontrole & traptechniek';

export default function AdminTrainingsPage() {
  const { user, isTrainerOrAdmin, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Form state
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState('19:00');
  const [selectedLocation, setSelectedLocation] = useState('Forum Sport - veld 1');
  const [focus, setFocus] = useState(DEFAULT_FOCUS);
  const [maxParticipants, setMaxParticipants] = useState(20);
  
  // Edit state
  const [editingSession, setEditingSession] = useState<TrainingSession | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editDate, setEditDate] = useState<Date | undefined>(undefined);
  const [editTime, setEditTime] = useState('19:00');
  const [editLocation, setEditLocation] = useState('Forum Sport - veld 1');
  const [editFocus, setEditFocus] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editMaxParticipants, setEditMaxParticipants] = useState(20);
  
  // Delete confirmation state
  const [deleteSessionId, setDeleteSessionId] = useState<string | null>(null);

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

  // Toggle completed status mutation
  const toggleCompletedMutation = useMutation({
    mutationFn: async ({ sessionId, isCompleted }: { sessionId: string; isCompleted: boolean }) => {
      const { error } = await supabase
        .from('training_sessions')
        .update({ is_completed: isCompleted })
        .eq('id', sessionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-training-sessions'] });
      toast({ title: 'Status bijgewerkt', description: 'De training status is aangepast.' });
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
      setDeleteSessionId(null);
    },
    onError: (error) => {
      toast({ title: 'Fout', description: error.message, variant: 'destructive' });
    },
  });

  // Update training session mutation
  const updateMutation = useMutation({
    mutationFn: async (updatedSession: {
      id: string;
      title: string;
      description: string;
      session_date: string;
      session_time: string;
      location: string;
      max_participants: number;
    }) => {
      const { error } = await supabase
        .from('training_sessions')
        .update({
          title: updatedSession.title,
          description: updatedSession.description,
          session_date: updatedSession.session_date,
          session_time: updatedSession.session_time,
          location: updatedSession.location,
          max_participants: updatedSession.max_participants,
        })
        .eq('id', updatedSession.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-training-sessions'] });
      toast({ title: 'Training bijgewerkt', description: 'De training is succesvol aangepast.' });
      setIsEditDialogOpen(false);
      setEditingSession(null);
    },
    onError: (error) => {
      toast({ title: 'Fout', description: error.message, variant: 'destructive' });
    },
  });

  const resetForm = () => {
    setSelectedDate(undefined);
    setSelectedTime('19:00');
    setSelectedLocation('Forum Sport - veld 1');
    setFocus(DEFAULT_FOCUS);
    setMaxParticipants(20);
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

  const handleEdit = (session: TrainingSession) => {
    setEditingSession(session);
    setEditDate(new Date(session.session_date));
    setEditTime(session.session_time.slice(0, 5));
    setEditLocation(session.location || 'Forum Sport - veld 1');
    setEditFocus(session.description || '');
    setEditTitle(session.title);
    setEditMaxParticipants(session.max_participants || 20);
    setIsEditDialogOpen(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingSession || !editDate) {
      toast({ title: 'Fout', description: 'Selecteer een datum', variant: 'destructive' });
      return;
    }

    updateMutation.mutate({
      id: editingSession.id,
      title: editTitle,
      description: editFocus,
      session_date: format(editDate, 'yyyy-MM-dd'),
      session_time: editTime,
      location: editLocation,
      max_participants: editMaxParticipants,
    });
  };

  const handleDelete = (sessionId: string) => {
    setDeleteSessionId(sessionId);
  };

  const confirmDelete = () => {
    if (deleteSessionId) {
      deleteMutation.mutate(deleteSessionId);
    }
  };

  const plannedSessions = useMemo(
    () => sessions?.filter((s) => classifySession(s as TrainingSession) === 'planned') ?? [],
    [sessions]
  );

  const completedSessions = useMemo(
    () => sessions?.filter((s) => classifySession(s as TrainingSession) === 'completed') ?? [],
    [sessions]
  );

  const renderSessions = (list: TrainingSession[]) => (
    <>
      {/* Mobile card view */}
      <div className="space-y-3 md:hidden">
        {list.map((session) => (
          <div
            key={session.id}
            className={cn(
              'rounded-lg border border-border p-4 space-y-3',
              session.is_completed && 'opacity-60'
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 font-semibold">
                  {session.is_completed && <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />}
                  <span className="truncate">
                    {format(new Date(session.session_date), 'EEEE d MMMM', { locale: nl })}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {session.session_time.slice(0, 5)} · {session.location || 'Forum Sport'}
                </p>
              </div>
              <label className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                <Checkbox
                  checked={session.is_completed}
                  onCheckedChange={(checked) =>
                    toggleCompletedMutation.mutate({
                      sessionId: session.id,
                      isCompleted: checked as boolean,
                    })
                  }
                />
                Afgerond
              </label>
            </div>
            <p className="text-sm">{session.description || '-'}</p>
            <div className="flex flex-wrap gap-2">
              <Link to={`/admin/aanwezigheid/${session.id}`} className="flex-1 min-w-[120px]">
                <Button variant="outline" size="sm" className="w-full gap-2">
                  <Users className="w-4 h-4" />
                  Aanwezigheid
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => handleEdit(session)}
              >
                <Pencil className="w-4 h-4" />
                Bewerken
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDelete(session.id)}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px]">Afgerond</TableHead>
              <TableHead>Datum</TableHead>
              <TableHead>Tijd</TableHead>
              <TableHead>Locatie</TableHead>
              <TableHead>Focus</TableHead>
              <TableHead className="text-right">Acties</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((session) => (
              <TableRow key={session.id} className={session.is_completed ? 'opacity-60' : ''}>
                <TableCell>
                  <Checkbox
                    checked={session.is_completed}
                    onCheckedChange={(checked) =>
                      toggleCompletedMutation.mutate({
                        sessionId: session.id,
                        isCompleted: checked as boolean,
                      })
                    }
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {session.is_completed && <CheckCircle className="w-4 h-4 text-green-500" />}
                    {format(new Date(session.session_date), "EEEE d MMMM", { locale: nl })}
                  </div>
                </TableCell>
                <TableCell>{session.session_time.slice(0, 5)}</TableCell>
                <TableCell>{session.location || 'Forum Sport'}</TableCell>
                <TableCell className="max-w-[200px] truncate">
                  {session.description || '-'}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Link to={`/admin/aanwezigheid/${session.id}`}>
                      <Button variant="ghost" size="icon" title="Aanwezigheid">
                        <Users className="w-4 h-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(session)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(session.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );

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

        <Tabs defaultValue="planned" className="w-full">
          <Card>
            <CardHeader className="flex flex-col gap-4">
              <CardTitle>Trainingen</CardTitle>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="planned">Gepland</TabsTrigger>
                <TabsTrigger value="completed">Afgerond</TabsTrigger>
              </TabsList>
            </CardHeader>
            <CardContent>
              {sessionsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : (
                <>
                  <TabsContent value="planned">
                    {plannedSessions.length > 0 ? (
                      renderSessions(plannedSessions)
                    ) : (
                      <p className="text-center text-muted-foreground py-8">
                        Nog geen geplande trainingen.
                      </p>
                    )}
                  </TabsContent>
                  <TabsContent value="completed">
                    {completedSessions.length > 0 ? (
                      renderSessions(completedSessions)
                    ) : (
                      <p className="text-center text-muted-foreground py-8">
                        Nog geen afgeronde trainingen.
                      </p>
                    )}
                  </TabsContent>
                </>
              )}
            </CardContent>
          </Card>
        </Tabs>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (!open) setEditingSession(null);
        }}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Training Bewerken</DialogTitle>
              <DialogDescription>
                Pas de details van de training aan.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEditSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="editTitle">Titel</Label>
                <Input
                  id="editTitle"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Training titel"
                />
              </div>

              <div className="space-y-2">
                <Label>Datum</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !editDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {editDate ? format(editDate, "EEEE d MMMM yyyy", { locale: nl }) : "Selecteer datum"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={editDate}
                      onSelect={setEditDate}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="editTime">Tijd</Label>
                <Input
                  id="editTime"
                  type="time"
                  value={editTime}
                  onChange={(e) => setEditTime(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Locatie</Label>
                <Select value={editLocation} onValueChange={setEditLocation}>
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
                <Label htmlFor="editFocus">Focus van de training</Label>
                <Textarea
                  id="editFocus"
                  value={editFocus}
                  onChange={(e) => setEditFocus(e.target.value.slice(0, 200))}
                  placeholder="Bijv. Balcontrole & traptechniek"
                  maxLength={200}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground text-right">{editFocus.length}/200</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="editMaxParticipants">Max. aantal deelnemers</Label>
                <Input
                  id="editMaxParticipants"
                  type="number"
                  min={1}
                  max={100}
                  value={editMaxParticipants}
                  onChange={(e) => setEditMaxParticipants(parseInt(e.target.value) || 20)}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Annuleren
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  Opslaan
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deleteSessionId} onOpenChange={(open) => !open && setDeleteSessionId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Training verwijderen?</AlertDialogTitle>
              <AlertDialogDescription>
                Weet je zeker dat je deze training wilt verwijderen? Dit kan niet ongedaan worden gemaakt.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuleren</AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Verwijderen
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}
