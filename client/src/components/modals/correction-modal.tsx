import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Meter } from '@shared/schema';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useMutation } from '@tanstack/react-query';

interface CorrectionModalProps {
  selectedMeter: Meter | null;
  isOpen: boolean;
  onClose: () => void;
}

interface CorrectionFormData {
  meterId: number;
  requestedReading: number;
  reason: string;
}

export function CorrectionModal({ selectedMeter, isOpen, onClose }: CorrectionModalProps) {
  const { toast } = useToast();
  const [reading, setReading] = useState('');
  const [reason, setReason] = useState('');

  // Reset form when modal opens with new meter
  useState(() => {
    if (isOpen && selectedMeter) {
      setReading('');
      setReason('');
    }
  });

  const correctionMutation = useMutation({
    mutationFn: async (data: CorrectionFormData) => {
      const res = await apiRequest('POST', '/api/correction-requests', data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Sikeres kérelem',
        description: 'A korrekciós kérelmet sikeresen elküldtük.',
      });
      onClose();
      // Invalidate correction requests query to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/correction-requests'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Hiba történt',
        description: error.message || 'Nem sikerült elküldeni a korrekciós kérelmet.',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedMeter) return;
    
    if (!reading.trim()) {
      toast({
        title: 'Hiányzó adat',
        description: 'Add meg a helyes óraállást.',
        variant: 'destructive',
      });
      return;
    }
    
    if (!reason.trim()) {
      toast({
        title: 'Hiányzó adat',
        description: 'Add meg a korrekció indoklását.',
        variant: 'destructive',
      });
      return;
    }
    
    const readingValue = parseInt(reading);
    if (isNaN(readingValue)) {
      toast({
        title: 'Érvénytelen érték',
        description: 'Az óraállásnak számnak kell lennie.',
        variant: 'destructive',
      });
      return;
    }
    
    correctionMutation.mutate({
      meterId: selectedMeter.id,
      requestedReading: readingValue,
      reason,
    });
  };
  
  if (!selectedMeter) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Óraállás korrekció kérése</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="meter-select">Mérőóra</Label>
              <Input 
                id="meter-select" 
                value={`${selectedMeter.name} (${selectedMeter.identifier})`} 
                disabled 
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="reading">Helyes óraállás</Label>
              <Input
                id="reading"
                type="number"
                value={reading}
                onChange={(e) => setReading(e.target.value)}
                placeholder={`Érték ${selectedMeter.unit} mértékegységben`}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="reason">Indoklás</Label>
              <Textarea
                id="reason"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Kérjük, indokolja meg a korrekciós kérelmet"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
            >
              Mégsem
            </Button>
            <Button 
              type="submit" 
              disabled={correctionMutation.isPending}
            >
              {correctionMutation.isPending ? 'Küldés...' : 'Kérelem küldése'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
