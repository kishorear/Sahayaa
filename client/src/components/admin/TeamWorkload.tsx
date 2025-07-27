import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, BarChart3 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface TeamMember {
  user: {
    id: number;
    name: string | null;
    username: string;
    email: string | null;
  };
  ticketCount: number;
}

interface Team {
  id: number;
  name: string;
  description: string | null;
}

export default function TeamWorkload() {
  const { user } = useAuth();
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");

  // Fetch teams for the current tenant
  const { data: teams, isLoading: teamsLoading } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
    enabled: !!user?.tenantId,
  });

  // Fetch workload for selected team
  const { data: workload, isLoading: workloadLoading } = useQuery<TeamMember[]>({
    queryKey: ["/api/teams", selectedTeamId, "workload"],
    enabled: !!selectedTeamId && selectedTeamId !== "",
  });

  const maxTickets = workload ? Math.max(...workload.map(w => w.ticketCount), 1) : 1;

  if (teamsLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-medium text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Team Workload Distribution
            </CardTitle>
            <CardDescription className="mt-1">
              View ticket distribution across team members to ensure balanced workload
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-6">
          {/* Team Selection */}
          <div className="space-y-2">
            <label htmlFor="team-select" className="text-sm font-medium text-gray-700">
              Select Team
            </label>
            <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
              <SelectTrigger id="team-select">
                <SelectValue placeholder="Choose a team to view workload..." />
              </SelectTrigger>
              <SelectContent>
                {teams?.map((team) => (
                  <SelectItem key={team.id} value={team.id.toString()}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Workload Display */}
          {selectedTeamId && (
            <div className="space-y-4">
              {workloadLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-2 w-full" />
                      </div>
                      <Skeleton className="h-6 w-12" />
                    </div>
                  ))}
                </div>
              ) : workload && workload.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Users className="w-4 h-4" />
                    <span>{workload.length} team members</span>
                  </div>
                  
                  {workload.map((member) => {
                    const percentage = maxTickets > 0 ? (member.ticketCount / maxTickets) * 100 : 0;
                    const isLeastBusy = member.ticketCount === Math.min(...workload.map(w => w.ticketCount));
                    
                    return (
                      <div key={member.user.id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium text-primary">
                                {(member.user.name || member.user.username).charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {member.user.name || member.user.username}
                              </p>
                              {member.user.email && (
                                <p className="text-xs text-gray-500">{member.user.email}</p>
                              )}
                            </div>
                            {isLeastBusy && (
                              <Badge variant="secondary" className="text-xs">
                                Next Assignment
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge 
                              variant={member.ticketCount === 0 ? "secondary" : "default"}
                              className="text-xs"
                            >
                              {member.ticketCount} tickets
                            </Badge>
                          </div>
                        </div>
                        <Progress 
                          value={percentage} 
                          className="h-2" 
                        />
                      </div>
                    );
                  })}
                  
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Smart Assignment:</strong> New tickets are automatically assigned to the team member 
                      with the lowest number of active tickets to ensure balanced workload distribution.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No team members found for this team.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}