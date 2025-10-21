import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { UserPlus, Trash2 } from "lucide-react";
import type { DelegateAssignment } from "@shared/types";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";

export default function DelegateSettings() {
  const [actingFor, setActingFor] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Mock current user - in production this would come from auth
  const currentUserId = "manager";

  const { data: delegations = [] } = useQuery<DelegateAssignment[]>({
    queryKey: ["/api/delegations"],
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/delegations", {
        userId: currentUserId,
        actingFor,
        startDate,
        endDate,
        active: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/delegations"] });
      setActingFor("");
      setStartDate("");
      setEndDate("");
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      return apiRequest("PATCH", `/api/delegations/${id}`, { active });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/delegations"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/delegations/${id}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/delegations"] });
    },
  });

  const handleCreate = () => {
    if (!actingFor || !startDate || !endDate) return;
    createMutation.mutate();
  };

  const myDelegations = delegations.filter((d) => d.userId === currentUserId);

  const isFormValid = actingFor && startDate && endDate && new Date(endDate) >= new Date(startDate);

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Delegation Settings</h1>
        <p className="text-muted-foreground">
          Manage approval delegation when you're away or unavailable
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Create New Delegation</CardTitle>
            <CardDescription>
              Assign someone to approve requests on your behalf
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="actingFor">Acting For (User ID/Email)</Label>
              <Input
                id="actingFor"
                placeholder="e.g., manager@example.com"
                value={actingFor}
                onChange={(e) => setActingFor(e.target.value)}
                className="mt-2"
                data-testid="input-acting-for"
              />
              <p className="text-xs text-muted-foreground mt-1">
                User who will approve requests on your behalf
              </p>
            </div>

            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-2"
                data-testid="input-start-date"
              />
            </div>

            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                className="mt-2"
                data-testid="input-end-date"
              />
            </div>

            <Button
              className="w-full gap-2"
              onClick={handleCreate}
              disabled={!isFormValid || createMutation.isPending}
              data-testid="button-create-delegation"
            >
              <UserPlus className="w-4 h-4" />
              {createMutation.isPending ? "Creating..." : "Create Delegation"}
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">My Delegations</h2>
            <Badge variant="outline">{myDelegations.length} active</Badge>
          </div>

          {myDelegations.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center text-muted-foreground">
                No delegations set up
              </CardContent>
            </Card>
          ) : (
            myDelegations.map((delegation) => {
              const isActive = delegation.active;
              const isCurrent =
                delegation.active &&
                new Date(delegation.startDate) <= new Date() &&
                new Date(delegation.endDate) >= new Date();

              return (
                <Card key={delegation.id} data-testid={`card-delegation-${delegation.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="font-medium">{delegation.actingFor}</div>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(delegation.startDate), "MMM dd, yyyy")} -{" "}
                          {format(new Date(delegation.endDate), "MMM dd, yyyy")}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isCurrent && (
                          <Badge className="bg-green-100 text-green-700">Current</Badge>
                        )}
                        <Switch
                          checked={isActive}
                          onCheckedChange={(checked) =>
                            toggleMutation.mutate({
                              id: delegation.id,
                              active: checked,
                            })
                          }
                          data-testid={`switch-active-${delegation.id}`}
                        />
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-2 text-red-600 hover:text-red-700"
                      onClick={() => deleteMutation.mutate(delegation.id)}
                      data-testid={`button-delete-${delegation.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </Button>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
