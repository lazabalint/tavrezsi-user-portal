import { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Meter, Property, CorrectionRequest } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation, useSearch } from "wouter";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { Wrench, Check, X, AlertTriangle, Clock, CheckCircle, XCircle, Plus } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

export default function CorrectionRequestsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const [activeTab, setActiveTab] = useState("all");
  const [selectedRequest, setSelectedRequest] = useState<CorrectionRequest | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Fetch correction requests
  const { data: requests, isLoading } = useQuery<CorrectionRequest[]>({
    queryKey: ['/api/correction-requests', activeTab !== "all" ? `status=${activeTab}` : null],
  });

  // Fetch all meters for reference
  const { data: meters } = useQuery<Meter[]>({
    queryKey: ['/api/meters'],
  });

  // Fetch all properties for reference
  const { data: properties } = useQuery<Property[]>({
    queryKey: ['/api/properties'],
  });

  // Update request status mutation
  const updateRequestMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiRequest("PATCH", `/api/correction-requests/${id}`, { status });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Sikeres frissítés",
        description: "A korrekciós kérelem státusza sikeresen frissítve",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/correction-requests'] });
      setDetailsOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Hiba történt",
        description: error.message || "Nem sikerült frissíteni a kérelem státuszát",
        variant: "destructive",
      });
    }
  });

  const handleApprove = (id: number) => {
    updateRequestMutation.mutate({ id, status: "approved" });
  };

  const handleReject = (id: number) => {
    updateRequestMutation.mutate({ id, status: "rejected" });
  };

  const viewRequestDetails = (request: CorrectionRequest) => {
    setSelectedRequest(request);
    setDetailsOpen(true);
  };

  // Helper functions to get related entity information
  const getMeterInfo = (meterId: number) => {
    if (!meters) return { name: `#${meterId}`, type: "other", identifier: "", unit: "" };
    const meter = meters.find(m => m.id === meterId);
    return meter || { name: `#${meterId}`, type: "other", identifier: "", unit: "" };
  };

  const getPropertyInfo = (meterId: number) => {
    if (!meters || !properties) return { name: "", address: "" };
    const meter = meters.find(m => m.id === meterId);
    if (!meter) return { name: "", address: "" };
    
    const property = properties.find(p => p.id === meter.propertyId);
    return property || { name: "", address: "" };
  };

  // Status badge color helper
  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'pending':
        return <Badge className="bg-amber-100 text-amber-800"><Clock className="mr-1 h-3 w-3" /> Függőben</Badge>;
      case 'approved':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="mr-1 h-3 w-3" /> Elfogadva</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="mr-1 h-3 w-3" /> Elutasítva</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <DashboardLayout title="Javítási kérelmek" description="Javítási kérelmek kezelése">
      <div className="space-y-4">
        {user?.role === 'admin' && (
          <div className="flex justify-end">
            <Button onClick={() => setLocation('/add-correction-request')}>
              <Plus className="w-4 h-4 mr-2" />
              Új javítási kérelem
            </Button>
          </div>
        )}
      </div>
      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full mb-6">
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="all">Összes kérelem</TabsTrigger>
          <TabsTrigger value="pending">Függőben lévő</TabsTrigger>
          <TabsTrigger value="approved">Elfogadott</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : requests && requests.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Korrekciós kérelmek</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Azonosító</TableHead>
                    <TableHead>Mérőóra</TableHead>
                    <TableHead>Ingatlan</TableHead>
                    <TableHead>Kért állás</TableHead>
                    <TableHead>Dátum</TableHead>
                    <TableHead>Státusz</TableHead>
                    <TableHead className="text-right">Műveletek</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((request) => {
                    const meterInfo = getMeterInfo(request.meterId);
                    const propertyInfo = getPropertyInfo(request.meterId);
                    
                    return (
                      <TableRow key={request.id}>
                        <TableCell className="font-medium">#{request.id}</TableCell>
                        <TableCell>{meterInfo.name}</TableCell>
                        <TableCell>{propertyInfo.address}</TableCell>
                        <TableCell>{request.requestedReading} {meterInfo.unit}</TableCell>
                        <TableCell>{format(new Date(request.createdAt), 'yyyy.MM.dd')}</TableCell>
                        <TableCell>{getStatusBadge(request.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-gray-500"
                              onClick={() => viewRequestDetails(request)}
                            >
                              Részletek
                            </Button>
                            {user && (user.role === 'admin' || user.role === 'owner') && request.status === 'pending' && (
                              <>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="text-green-500 hover:text-green-700 hover:bg-green-50"
                                  onClick={() => handleApprove(request.id)}
                                  disabled={updateRequestMutation.isPending}
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => handleReject(request.id)}
                                  disabled={updateRequestMutation.isPending}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="bg-white p-8 rounded-lg text-center shadow-sm">
          <div className="mb-4 text-gray-400">
            <Wrench className="w-16 h-16 mx-auto" />
          </div>
          <h3 className="text-xl font-medium mb-2">Nincsenek korrekciós kérelmek</h3>
          {activeTab !== "all" ? (
            <p className="text-gray-500">Nincsenek {activeTab === "pending" ? "függőben lévő" : "elfogadott"} kérelmek.</p>
          ) : (
            <p className="text-gray-500">Még nem érkeztek korrekciós kérelmek.</p>
          )}
        </div>
      )}
      
      {/* Request Details Dialog */}
      {selectedRequest && (
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Korrekciós kérelem részletei</DialogTitle>
              <DialogDescription>
                Kérelem azonosító: #{selectedRequest.id}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Kérelmező</h4>
                  <p>#{selectedRequest.requestedById}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Dátum</h4>
                  <p>{format(new Date(selectedRequest.createdAt), 'yyyy.MM.dd HH:mm')}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Mérőóra</h4>
                  <p>{getMeterInfo(selectedRequest.meterId).name}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Kért óraállás</h4>
                  <p>{selectedRequest.requestedReading} {getMeterInfo(selectedRequest.meterId).unit}</p>
                </div>
                <div className="col-span-2">
                  <h4 className="text-sm font-medium text-gray-500">Ingatlan</h4>
                  <p>{getPropertyInfo(selectedRequest.meterId).address}</p>
                </div>
                <div className="col-span-2">
                  <h4 className="text-sm font-medium text-gray-500">Indoklás</h4>
                  <p className="whitespace-pre-wrap">{selectedRequest.reason}</p>
                </div>
                <div className="col-span-2">
                  <h4 className="text-sm font-medium text-gray-500">Státusz</h4>
                  <div className="mt-1">{getStatusBadge(selectedRequest.status)}</div>
                </div>
                {selectedRequest.resolvedAt && (
                  <>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Elbírálás dátuma</h4>
                      <p>{format(new Date(selectedRequest.resolvedAt), 'yyyy.MM.dd HH:mm')}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Elbíráló</h4>
                      <p>#{selectedRequest.resolvedById}</p>
                    </div>
                  </>
                )}
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setDetailsOpen(false)}
              >
                Bezárás
              </Button>
              {user && (user.role === 'admin' || user.role === 'owner') && selectedRequest.status === 'pending' && (
                <>
                  <Button 
                    variant="destructive" 
                    onClick={() => handleReject(selectedRequest.id)}
                    disabled={updateRequestMutation.isPending}
                  >
                    Elutasítás
                  </Button>
                  <Button 
                    onClick={() => handleApprove(selectedRequest.id)}
                    disabled={updateRequestMutation.isPending}
                  >
                    Elfogadás
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </DashboardLayout>
  );
}
