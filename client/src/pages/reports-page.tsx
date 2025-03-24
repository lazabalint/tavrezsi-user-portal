import { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Meter, Property, Reading } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { BarChart2, LineChart, Download, Calendar } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { addDays } from "date-fns";

export default function ReportsPage() {
  const { user } = useAuth();
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");
  const [reportType, setReportType] = useState("consumption");
  const [dateRange, setDateRange] = useState({
    from: subMonths(new Date(), 6),
    to: new Date(),
  });

  // Fetch properties
  const { data: properties, isLoading: propertiesLoading } = useQuery<Property[]>({
    queryKey: ['/api/properties'],
  });

  // Fetch meters for selected property
  const { data: meters, isLoading: metersLoading } = useQuery<Meter[]>({
    queryKey: ['/api/meters', selectedPropertyId ? `propertyId=${selectedPropertyId}` : null],
    enabled: !!selectedPropertyId,
  });

  // Mock data for the reports - in a real app, we would fetch this from the API
  const mockConsumptionData = [
    { name: '2023 Jan', electricity: 145, gas: 38, water: 5.8 },
    { name: '2023 Feb', electricity: 142, gas: 39, water: 5.7 },
    { name: '2023 Mar', electricity: 135, gas: 32, water: 5.9 },
    { name: '2023 Apr', electricity: 120, gas: 25, water: 6.1 },
    { name: '2023 Máj', electricity: 118, gas: 18, water: 6.5 },
    { name: '2023 Jún', electricity: 115, gas: 12, water: 7.2 },
  ];

  const mockDistributionData = [
    { name: 'Villany', value: 775, color: '#4285f4' },
    { name: 'Gáz', value: 164, color: '#fbbc04' },
    { name: 'Víz', value: 37.2, color: '#00bcd4' },
  ];

  const mockCostData = [
    { name: '2023 Jan', electricity: 19200, gas: 15600, water: 4500 },
    { name: '2023 Feb', electricity: 18800, gas: 16000, water: 4400 },
    { name: '2023 Mar', electricity: 17900, gas: 13100, water: 4600 },
    { name: '2023 Apr', electricity: 15900, gas: 10200, water: 4800 },
    { name: '2023 Máj', electricity: 15600, gas: 7400, water: 5100 },
    { name: '2023 Jún', electricity: 15200, gas: 4900, water: 5600 },
  ];

  const handlePropertyChange = (value: string) => {
    setSelectedPropertyId(value);
  };

  // Get selected property details
  const selectedProperty = selectedPropertyId 
    ? properties?.find(p => p.id.toString() === selectedPropertyId) 
    : null;

  return (
    <DashboardLayout title="Riportok" description="Fogyasztás áttekintése és riportok">
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div className="w-full md:w-1/3">
            {propertiesLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Select value={selectedPropertyId} onValueChange={handlePropertyChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Válasszon ingatlant" />
                </SelectTrigger>
                <SelectContent>
                  {properties?.map((property) => (
                    <SelectItem key={property.id} value={property.id.toString()}>
                      {property.name}, {property.address}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </div>

      {!selectedPropertyId ? (
        <div className="bg-white p-8 rounded-lg text-center shadow-sm">
          <div className="mb-4 text-gray-400">
            <BarChart2 className="w-16 h-16 mx-auto" />
          </div>
          <h3 className="text-xl font-medium mb-2">Válasszon ingatlant</h3>
          <p className="text-gray-500">A riportok megtekintéséhez először válassza ki az egyik ingatlanát a legördülő menüből.</p>
        </div>
      ) : metersLoading ? (
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[400px] w-full" />
          </CardContent>
        </Card>
      ) : meters && meters.length > 0 ? (
        <>
          <div className="flex flex-col md:flex-row mb-6 gap-4 items-center">
            <Tabs defaultValue="consumption" value={reportType} onValueChange={setReportType} className="w-full">
              <TabsList className="grid w-full max-w-md grid-cols-3">
                <TabsTrigger value="consumption">Fogyasztás</TabsTrigger>
                <TabsTrigger value="distribution">Megoszlás</TabsTrigger>
                <TabsTrigger value="cost">Költség</TabsTrigger>
              </TabsList>
            </Tabs>
            
            <div className="flex items-center gap-2">
              <DatePickerWithRange 
                date={dateRange} 
                setDate={setDateRange}
              />
              <Button variant="outline" size="icon">
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {reportType === "consumption" && (
              <Card>
                <CardHeader>
                  <CardTitle>Fogyasztás</CardTitle>
                  <CardDescription>
                    {selectedProperty?.name}, {selectedProperty?.address} - 
                    {format(dateRange.from || subMonths(new Date(), 6), "yyyy.MM.dd")} - 
                    {format(dateRange.to || new Date(), "yyyy.MM.dd")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        width={500}
                        height={300}
                        data={mockConsumptionData}
                        margin={{
                          top: 20,
                          right: 30,
                          left: 20,
                          bottom: 5,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="electricity" name="Villany (kWh)" fill="#4285f4" />
                        <Bar dataKey="gas" name="Gáz (m³)" fill="#fbbc04" />
                        <Bar dataKey="water" name="Víz (m³)" fill="#00bcd4" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {reportType === "distribution" && (
              <Card>
                <CardHeader>
                  <CardTitle>Fogyasztás megoszlása</CardTitle>
                  <CardDescription>
                    {selectedProperty?.name}, {selectedProperty?.address} - 
                    {format(dateRange.from || subMonths(new Date(), 6), "yyyy.MM.dd")} - 
                    {format(dateRange.to || new Date(), "yyyy.MM.dd")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[400px] flex justify-center items-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart width={400} height={400}>
                        <Pie
                          data={mockDistributionData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={150}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {mockDistributionData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [`${value}`, 'Fogyasztás']} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {reportType === "cost" && (
              <Card>
                <CardHeader>
                  <CardTitle>Költségek</CardTitle>
                  <CardDescription>
                    {selectedProperty?.name}, {selectedProperty?.address} - 
                    {format(dateRange.from || subMonths(new Date(), 6), "yyyy.MM.dd")} - 
                    {format(dateRange.to || new Date(), "yyyy.MM.dd")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        width={500}
                        height={300}
                        data={mockCostData}
                        margin={{
                          top: 20,
                          right: 30,
                          left: 20,
                          bottom: 5,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip formatter={(value) => [`${value} Ft`, 'Költség']} />
                        <Legend />
                        <Bar dataKey="electricity" name="Villany (Ft)" fill="#4285f4" />
                        <Bar dataKey="gas" name="Gáz (Ft)" fill="#fbbc04" />
                        <Bar dataKey="water" name="Víz (Ft)" fill="#00bcd4" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Összesített fogyasztás</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-gray-500">Villany</span>
                        <span className="font-medium">775 kWh</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full" style={{width: '65%'}}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-gray-500">Gáz</span>
                        <span className="font-medium">164 m³</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-orange-500 h-2 rounded-full" style={{width: '30%'}}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-gray-500">Víz</span>
                        <span className="font-medium">37.2 m³</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-cyan-500 h-2 rounded-full" style={{width: '45%'}}></div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Összesített költség</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-gray-500">Villany</span>
                        <span className="font-medium">102 600 Ft</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full" style={{width: '58%'}}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-gray-500">Gáz</span>
                        <span className="font-medium">67 200 Ft</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-orange-500 h-2 rounded-full" style={{width: '38%'}}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-gray-500">Víz</span>
                        <span className="font-medium">29 000 Ft</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-cyan-500 h-2 rounded-full" style={{width: '16%'}}></div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Trendek</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-sm text-gray-500">Villany</div>
                        <div className="text-lg font-semibold flex items-center">
                          <span className="text-green-600 mr-1">↓ 8.3%</span>
                          <span>az előző hónaphoz</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-sm text-gray-500">Gáz</div>
                        <div className="text-lg font-semibold flex items-center">
                          <span className="text-green-600 mr-1">↓ 33.8%</span>
                          <span>az előző hónaphoz</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-sm text-gray-500">Víz</div>
                        <div className="text-lg font-semibold flex items-center">
                          <span className="text-red-600 mr-1">↑ 8.9%</span>
                          <span>az előző hónaphoz</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white p-8 rounded-lg text-center shadow-sm">
          <div className="mb-4 text-gray-400">
            <BarChart2 className="w-16 h-16 mx-auto" />
          </div>
          <h3 className="text-xl font-medium mb-2">Nincsenek mérőórák</h3>
          <p className="text-gray-500">A kiválasztott ingatlanhoz még nincsenek mérőórák hozzárendelve, így riportok sem érhetők el.</p>
        </div>
      )}
    </DashboardLayout>
  );
}
