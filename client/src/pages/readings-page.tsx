import { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Meter, Property, Reading } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation, useSearch } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { History, LineChart, Plus, UploadCloud } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const newReadingSchema = z.object({
  reading: z.coerce.number().positive("Az érték csak pozitív szám lehet"),
  meterId: z.coerce.number().positive()
});

export default function ReadingsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const searchParams = new URLSearchParams(search);
  const meterIdParam = searchParams.get('meterId');
  
  const [selectedMeter, setSelectedMeter] = useState<string>(meterIdParam || "");
  const [showNewReadingDialog, setShowNewReadingDialog] = useState(false);
  const [showChartView, setShowChartView] = useState(true);

  // Setup form
  const form = useForm<z.infer<typeof newReadingSchema>>({
    resolver: zodResolver(newReadingSchema),
    defaultValues: {
      reading: 0,
      meterId: meterIdParam ? parseInt(meterIdParam) : 0
    },
  });

  // Fetch properties
  const { data: properties } = useQuery<Property[]>({
    queryKey: ['/api/properties'],
  });

  // Fetch all meters
  const { data: allMeters, isLoading: metersLoading } = useQuery<Meter[]>({
    queryKey: ['/api/meters'],
  });

  // Filter meters by property for the select
  const getMetersByProperty = () => {
    if (!allMeters || !properties) return [];
    
    return allMeters.map(meter => {
      const property = properties.find(p => p.id === meter.propertyId);
      return {
        ...meter,
        propertyName: property ? `${property.name}, ${property.address}` : 'Ismeretlen ingatlan'
      };
    });
  };

  // Fetch readings for selected meter
  const { data: readings, isLoading: readingsLoading } = useQuery<Reading[]>({
    queryKey: ['/api/readings', selectedMeter ? `meterId=${selectedMeter}` : null],
    enabled: !!selectedMeter,
  });

  // Get current meter details
  const currentMeter = selectedMeter && allMeters 
    ? allMeters.find(m => m.id.toString() === selectedMeter) 
    : null;

  // Submit new reading mutation
  const submitReadingMutation = useMutation({
    mutationFn: async (data: z.infer<typeof newReadingSchema>) => {
      const res = await apiRequest("POST", "/api/readings", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Sikeres leolvasás",
        description: "Az óraállás sikeresen rögzítve lett",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/readings'] });
      setShowNewReadingDialog(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Hiba történt",
        description: error.message || "Nem sikerült rögzíteni az óraállást",
        variant: "destructive",
      });
    }
  });

  const handleMeterChange = (value: string) => {
    setSelectedMeter(value);
    // Update URL without reloading the page
    if (value) {
      setLocation(`/readings?meterId=${value}`, { replace: true });
    } else {
      setLocation('/readings', { replace: true });
    }
    
    // Reset form with new meter ID
    if (value) {
      form.setValue('meterId', parseInt(value));
    }
  };

  const onSubmitReading = (values: z.infer<typeof newReadingSchema>) => {
    submitReadingMutation.mutate(values);
  };

  // Prepare chart data
  const chartData = readings?.map(reading => ({
    date: format(new Date(reading.timestamp), 'MM.dd'),
    value: reading.reading,
    formattedDate: format(new Date(reading.timestamp), 'yyyy.MM.dd')
  })).reverse() || [];

  // Get meter type badge color
  const getMeterTypeColor = (type?: string) => {
    const colorMap: Record<string, string> = {
      electricity: 'bg-blue-100 text-blue-800',
      gas: 'bg-orange-100 text-orange-800',
      water: 'bg-cyan-100 text-cyan-800',
      other: 'bg-gray-100 text-gray-800'
    };
    return type ? colorMap[type] || colorMap.other : colorMap.other;
  };

  return (
    <DashboardLayout title="Leolvasások" description="Mérőóra leolvasások kezelése és áttekintése">
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div className="w-full md:w-1/3">
            {metersLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Select value={selectedMeter} onValueChange={handleMeterChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Válasszon mérőórát" />
                </SelectTrigger>
                <SelectContent>
                  {getMetersByProperty().map((meter) => (
                    <SelectItem key={meter.id} value={meter.id.toString()}>
                      {meter.name} ({meter.identifier}) - {meter.propertyName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="flex gap-2">
            <Button 
              variant={showChartView ? "default" : "outline"} 
              size="sm" 
              onClick={() => setShowChartView(true)}
            >
              <LineChart className="mr-2 h-4 w-4" />
              Grafikon
            </Button>
            <Button 
              variant={!showChartView ? "default" : "outline"} 
              size="sm" 
              onClick={() => setShowChartView(false)}
            >
              <History className="mr-2 h-4 w-4" />
              Történet
            </Button>
            <Button onClick={() => setShowNewReadingDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Új leolvasás
            </Button>
          </div>
        </div>
      </div>

      {!selectedMeter ? (
        <div className="bg-white p-8 rounded-lg text-center shadow-sm">
          <div className="mb-4 text-gray-400">
            <History className="w-16 h-16 mx-auto" />
          </div>
          <h3 className="text-xl font-medium mb-2">Válasszon mérőórát</h3>
          <p className="text-gray-500">A leolvasások megtekintéséhez először válasszon egy mérőórát a legördülő menüből.</p>
        </div>
      ) : readingsLoading ? (
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full mb-4" />
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : readings && readings.length > 0 ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{currentMeter?.name} - Leolvasások</CardTitle>
              <div className="flex items-center gap-2 mt-2">
                <Badge className={getMeterTypeColor(currentMeter?.type)}>
                  {currentMeter?.type === 'electricity' && "Villanyóra"}
                  {currentMeter?.type === 'gas' && "Gázóra"}
                  {currentMeter?.type === 'water' && "Vízóra"}
                  {currentMeter?.type === 'other' && "Egyéb mérő"}
                </Badge>
                <span className="text-sm text-gray-500">Azonosító: {currentMeter?.identifier}</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {showChartView ? (
              <div className="h-[300px] mb-6">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={chartData}
                    margin={{
                      top: 10,
                      right: 30,
                      left: 0,
                      bottom: 0,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value) => [`${value} ${currentMeter?.unit}`, 'Érték']}
                      labelFormatter={(label, payload) => {
                        if (payload.length > 0) {
                          return payload[0].payload.formattedDate;
                        }
                        return label;
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#1e8e3e" 
                      fill="rgba(30, 142, 62, 0.2)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : null}

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Időpont</TableHead>
                    <TableHead>Állás</TableHead>
                    <TableHead>Forrás</TableHead>
                    <TableHead>Beküldő</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {readings.map((reading) => (
                    <TableRow key={reading.id}>
                      <TableCell className="font-medium">
                        {format(new Date(reading.timestamp), 'yyyy.MM.dd HH:mm')}
                      </TableCell>
                      <TableCell>
                        {reading.reading} {currentMeter?.unit}
                      </TableCell>
                      <TableCell>
                        {reading.isIoT ? (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            <UploadCloud className="mr-1 h-3 w-3" />
                            IoT eszköz
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                            <History className="mr-1 h-3 w-3" />
                            Manuális
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {reading.submittedById ? `#${reading.submittedById}` : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="bg-white p-8 rounded-lg text-center shadow-sm">
          <div className="mb-4 text-gray-400">
            <History className="w-16 h-16 mx-auto" />
          </div>
          <h3 className="text-xl font-medium mb-2">Nincsenek leolvasások</h3>
          <p className="text-gray-500 mb-4">A kiválasztott mérőórához még nincsenek leolvasások.</p>
          <Button onClick={() => setShowNewReadingDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Új leolvasás hozzáadása
          </Button>
        </div>
      )}
      
      {/* New Reading Dialog */}
      <Dialog open={showNewReadingDialog} onOpenChange={setShowNewReadingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Új leolvasás rögzítése</DialogTitle>
            <DialogDescription>
              {currentMeter ? `${currentMeter.name} (${currentMeter.identifier})` : 'Adja meg az aktuális óraállást'}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitReading)} className="space-y-4">
              <FormField
                control={form.control}
                name="reading"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Óraállás {currentMeter ? `(${currentMeter.unit})` : ''}</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="meterId"
                render={({ field }) => (
                  <FormItem className="hidden">
                    <FormControl>
                      <Input type="hidden" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowNewReadingDialog(false)}
                >
                  Mégsem
                </Button>
                <Button 
                  type="submit"
                  disabled={submitReadingMutation.isPending}
                >
                  {submitReadingMutation.isPending ? "Rögzítés..." : "Rögzítés"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
