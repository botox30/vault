import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import { getAuthHeader } from "@/lib/auth";

export function useFriends() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const friendsQuery = useQuery({
    queryKey: [api.friends.list.path],
    queryFn: async () => {
      const res = await fetch(api.friends.list.path, { headers: getAuthHeader() });
      if (!res.ok) throw new Error("Failed to fetch friends");
      return api.friends.list.responses[200].parse(await res.json());
    },
  });

  const requestsQuery = useQuery({
    queryKey: [api.friends.requests.path],
    queryFn: async () => {
      const res = await fetch(api.friends.requests.path, { headers: getAuthHeader() });
      if (!res.ok) throw new Error("Failed to fetch requests");
      return api.friends.requests.responses[200].parse(await res.json());
    },
  });

  const sendRequestMutation = useMutation({
    mutationFn: async (username: string) => {
      const res = await fetch(api.friends.request.path, {
        method: api.friends.request.method,
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({ username }),
      });

      if (!res.ok) {
        if (res.status === 404) throw new Error("User not found");
        if (res.status === 409) throw new Error("Friend request already sent or exists");
        throw new Error("Failed to send request");
      }
      return api.friends.request.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      toast({ title: "Request sent", description: "Friend request sent successfully!" });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Could not send request", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  const acceptRequestMutation = useMutation({
    mutationFn: async (requestId: number) => {
      const url = buildUrl(api.friends.accept.path, { id: requestId });
      const res = await fetch(url, { method: "POST", headers: getAuthHeader() });
      if (!res.ok) throw new Error("Failed to accept request");
      return api.friends.accept.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.friends.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.friends.requests.path] });
      toast({ title: "Friend added", description: "You can now chat with your new friend!" });
    },
  });

  const rejectRequestMutation = useMutation({
    mutationFn: async (requestId: number) => {
      const url = buildUrl(api.friends.reject.path, { id: requestId });
      const res = await fetch(url, { method: "POST", headers: getAuthHeader() });
      if (!res.ok) throw new Error("Failed to reject request");
      return api.friends.reject.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.friends.requests.path] });
    },
  });

  return {
    friends: friendsQuery.data || [],
    isLoadingFriends: friendsQuery.isLoading,
    requests: requestsQuery.data || [],
    isLoadingRequests: requestsQuery.isLoading,
    sendRequest: sendRequestMutation,
    acceptRequest: acceptRequestMutation,
    rejectRequest: rejectRequestMutation,
  };
}
