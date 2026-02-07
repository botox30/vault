import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { type InsertUser } from "@shared/schema";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { clearToken, getAuthHeader, getToken, setToken } from "@/lib/auth";

export function useAuth() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const userQuery = useQuery({
    queryKey: [api.auth.me.path],
    queryFn: async () => {
      const token = getToken();
      if (!token) return null;

      const res = await fetch(api.auth.me.path, {
        headers: getAuthHeader(),
      });
      if (res.status === 401) {
        clearToken();
        return null;
      }
      if (!res.ok) throw new Error("Failed to fetch user");
      return api.auth.me.responses[200].parse(await res.json());
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: Pick<InsertUser, "username" | "password">) => {
      const res = await fetch(api.auth.login.path, {
        method: api.auth.login.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });
      
      if (!res.ok) {
        if (res.status === 401) throw new Error("Invalid username or password");
        throw new Error("Login failed");
      }
      return api.auth.login.responses[200].parse(await res.json());
    },
    onSuccess: ({ token, user }) => {
      setToken(token);
      queryClient.setQueryData([api.auth.me.path], user);
      toast({ title: "Welcome back!", description: `Logged in as ${user.username}` });
      setLocation("/");
    },
    onError: (error: Error) => {
      toast({ 
        title: "Login failed", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: InsertUser) => {
      const validated = api.auth.register.input.parse(data);
      const res = await fetch(api.auth.register.path, {
        method: api.auth.register.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
      });

      if (!res.ok) {
        if (res.status === 409) throw new Error("Username already taken");
        if (res.status === 400) throw new Error("Invalid input data");
        throw new Error("Registration failed");
      }
      return api.auth.register.responses[201].parse(await res.json());
    },
    onSuccess: ({ token, user }) => {
      setToken(token);
      queryClient.setQueryData([api.auth.me.path], user);
      toast({ title: "Account created", description: `Welcome, ${user.username}!` });
      setLocation("/");
    },
    onError: (error: Error) => {
      toast({ 
        title: "Registration failed", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await fetch(api.auth.logout.path, { 
        method: api.auth.logout.method,
        headers: getAuthHeader(),
      });
    },
    onSuccess: () => {
      clearToken();
      queryClient.setQueryData([api.auth.me.path], null);
      setLocation("/auth");
      toast({ title: "Logged out", description: "See you next time!" });
    },
  });

  return {
    user: userQuery.data,
    isLoading: userQuery.isLoading,
    login: loginMutation,
    register: registerMutation,
    logout: logoutMutation,
  };
}
