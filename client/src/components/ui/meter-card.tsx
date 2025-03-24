import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Meter, Reading } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Edit } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format } from "date-fns";

interface MeterCardProps {
  meter: Meter;
  propertyAddress: string;
  onRequestCorrection: (meter: Meter) => void;
}

export function MeterCard({ meter, propertyAddress, onRequestCorrection }: MeterCardProps) {
  const { toast } = useToast();

  // Fetch readings for this meter
  const { data: readings, isLoading } = useQuery<Reading[]>({
    queryKey: ['/api/readings', `meterId=${meter.id}&limit=10`],
    staleTime: 60000, // 1 minute
  });

  const latestReading = readings && readings.length > 0 ? readings[0] : null;
  const formattedDate = latestReading ? format(new Date(latestReading.timestamp), 'yyyy.MM.dd') : '-';

  // Map meter type to display name and icon color
  const meterTypeMap: Record<string, { label: string, iconName: string, bgColor: string, textColor: string }> = {
    electricity: { 
      label: 'Villanyóra', 
      iconName: 'bolt', 
      bgColor: 'bg-blue-50', 
      textColor: 'text-blue-500' 
    },
    gas: { 
      label: 'Gázóra', 
      iconName: 'local_fire_department', 
      bgColor: 'bg-orange-50', 
      textColor: 'text-orange-500' 
    },
    water: { 
      label: 'Vízóra', 
      iconName: 'water_drop', 
      bgColor: 'bg-cyan-50', 
      textColor: 'text-cyan-500' 
    },
    other: { 
      label: 'Egyéb mérő', 
      iconName: 'devices_other', 
      bgColor: 'bg-gray-50', 
      textColor: 'text-gray-500' 
    }
  };

  const meterTypeInfo = meterTypeMap[meter.type] || meterTypeMap.other;
  
  // Prepare chart data
  const chartData = readings?.map(reading => ({
    date: format(new Date(reading.timestamp), 'MM.dd'),
    value: reading.reading,
  })).reverse() || [];

  return (
    <Card className="overflow-hidden shadow-sm">
      <CardHeader className={`p-4 border-b border-gray-200 ${meterTypeInfo.bgColor} flex flex-row justify-between items-center`}>
        <div className="font-medium flex items-center">
          <span className={`material-icons mr-2 ${meterTypeInfo.textColor}`}>{meterTypeInfo.iconName}</span>
          {meterTypeInfo.label}
        </div>
        <span className="text-xs px-2 py-1 bg-white bg-opacity-60 rounded-full">
          {propertyAddress}
        </span>
      </CardHeader>
      <CardContent className="p-4">
        <div className="flex justify-between mb-2">
          <span className="text-gray-500">Azonosító:</span>
          <span className="font-medium">{meter.identifier}</span>
        </div>
        <div className="flex justify-between mb-4">
          <span className="text-gray-500">Utolsó leolvasás:</span>
          <span className="font-medium">{formattedDate}</span>
        </div>
        <div className="flex items-end justify-between">
          <div>
            <span className="text-xs text-gray-500 block">Jelenlegi állás</span>
            <span className="text-2xl font-bold">
              {latestReading ? `${latestReading.reading} ${meter.unit}` : `-`}
            </span>
          </div>
          <Button 
            variant="ghost" 
            className="text-primary hover:text-primary-dark flex items-center"
            onClick={() => onRequestCorrection(meter)}
          >
            <Edit className="mr-1 h-4 w-4" />
            Korrekció
          </Button>
        </div>
        
        {readings && readings.length > 0 ? (
          <div className="mt-4">
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{
                    top: 10,
                    right: 0,
                    left: 0,
                    bottom: 0,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#1e8e3e" 
                    fill="rgba(30, 142, 62, 0.2)" 
                    name={`${meterTypeInfo.label} (${meter.unit})`}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className="mt-4 p-6 text-center text-gray-500 border border-dashed border-gray-200 rounded-lg">
            Nincs elég adat a grafikon megjelenítéséhez
          </div>
        )}
      </CardContent>
    </Card>
  );
}
