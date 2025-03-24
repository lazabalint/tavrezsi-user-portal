import { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { User } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { Users, Plus, UserCog, Shield } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

export default function UsersPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [roleFilter, setRoleFilter] = useState<string>("all");

  // Check if user is admin
  const isAdmin = user?.role === 'admin';

  // Fetch users
  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ['/api/users', roleFilter !== "all" ? `role=${roleFilter}` : null],
    enabled: isAdmin,
  });

  // Get role badge
  const getRoleBadge = (role: string) => {
    switch(role) {
      case 'admin':
        return <Badge className="bg-purple-100 text-purple-800">Adminisztrátor</Badge>;
      case 'owner':
        return <Badge className="bg-blue-100 text-blue-800">Tulajdonos</Badge>;
      case 'tenant':
        return <Badge className="bg-green-100 text-green-800">Bérlő</Badge>;
      default:
        return <Badge>{role}</Badge>;
    }
  };

  // If not admin, show access denied
  if (!isAdmin) {
    return (
      <DashboardLayout title="Felhasználók" description="Felhasználók kezelése">
        <div className="bg-white p-8 rounded-lg text-center shadow-sm">
          <div className="mb-4 text-red-400">
            <Shield className="w-16 h-16 mx-auto" />
          </div>
          <h3 className="text-xl font-medium mb-2">Hozzáférés megtagadva</h3>
          <p className="text-gray-500">Ez az oldal csak adminisztrátorok számára érhető el.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Felhasználók" description="Felhasználók kezelése és áttekintése">
      <div className="mb-6 flex justify-between items-center">
        <Tabs defaultValue="all" value={roleFilter} onValueChange={setRoleFilter} className="w-full max-w-md">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">Összes</TabsTrigger>
            <TabsTrigger value="admin">Admin</TabsTrigger>
            <TabsTrigger value="owner">Tulajdonos</TabsTrigger>
            <TabsTrigger value="tenant">Bérlő</TabsTrigger>
          </TabsList>
        </Tabs>
        
        <Button asChild>
          <Link href="/add-user">
            <Plus className="mr-2 h-4 w-4" />
            Új felhasználó
          </Link>
        </Button>
      </div>

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
      ) : users && users.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Felhasználók listája</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Azonosító</TableHead>
                    <TableHead>Név</TableHead>
                    <TableHead>Felhasználónév</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Szerepkör</TableHead>
                    <TableHead>Regisztráció dátuma</TableHead>
                    <TableHead className="text-right">Műveletek</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">#{user.id}</TableCell>
                      <TableCell>{user.name}</TableCell>
                      <TableCell>{user.username}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell>{new Date(user.createdAt).toLocaleDateString('hu-HU')}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/permissions?userId=${user.id}`}>
                            <UserCog className="mr-2 h-4 w-4" />
                            Jogosultságok
                          </Link>
                        </Button>
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
            <Users className="w-16 h-16 mx-auto" />
          </div>
          <h3 className="text-xl font-medium mb-2">Nincsenek felhasználók</h3>
          {roleFilter !== "all" ? (
            <p className="text-gray-500 mb-4">Nincsenek {roleFilter} szerepkörű felhasználók.</p>
          ) : (
            <p className="text-gray-500 mb-4">Még nincsenek felhasználók a rendszerben.</p>
          )}
          <Button asChild>
            <Link href="/add-user">
              <Plus className="mr-2 h-4 w-4" />
              Új felhasználó hozzáadása
            </Link>
          </Button>
        </div>
      )}
    </DashboardLayout>
  );
}
