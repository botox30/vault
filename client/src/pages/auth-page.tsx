import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShieldCheck, Lock } from "lucide-react";
import { motion } from "framer-motion";
import { insertUserSchema } from "@shared/schema";

export default function AuthPage() {
  const { login, register } = useAuth();
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");

  const formSchema = z.object({
    username: z.string().min(3, "Username must be at least 3 characters"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    email: z.string().email().optional().or(z.literal("")),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      password: "",
      email: "",
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (activeTab === "login") {
      login.mutate({ username: values.username, password: values.password });
    } else {
      register.mutate(values);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop')] bg-cover bg-center">
      {/* Overlay to darken background */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md px-4"
      >
        <Card className="glass-panel border-0 shadow-2xl overflow-hidden">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-12 h-12 bg-primary rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-primary/20">
              <ShieldCheck className="text-white w-7 h-7" />
            </div>
            <CardTitle className="text-3xl font-bold tracking-tight">Welcome to Vault</CardTitle>
            <CardDescription className="text-muted-foreground mt-1">
              Secure, anonymous communication.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6 bg-muted/50 p-1">
                <TabsTrigger value="login" className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">Login</TabsTrigger>
                <TabsTrigger value="register" className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">Register</TabsTrigger>
              </TabsList>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs uppercase font-bold text-muted-foreground">Username</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your username" {...field} className="bg-black/20 border-0 focus-visible:ring-offset-0 focus-visible:ring-primary/50" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs uppercase font-bold text-muted-foreground">Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" {...field} className="bg-black/20 border-0 focus-visible:ring-offset-0 focus-visible:ring-primary/50" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {activeTab === "register" && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                    >
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs uppercase font-bold text-muted-foreground">Email (Optional)</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="you@example.com" {...field} className="bg-black/20 border-0 focus-visible:ring-offset-0 focus-visible:ring-primary/50" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </motion.div>
                  )}

                  <Button 
                    type="submit" 
                    className="w-full mt-6 bg-primary hover:bg-primary/90 text-white font-semibold py-6 text-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
                    disabled={login.isPending || register.isPending}
                  >
                    {(login.isPending || register.isPending) ? (
                      <span className="flex items-center gap-2">
                        <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                        Processing...
                      </span>
                    ) : (
                      activeTab === "login" ? "Log In" : "Create Account"
                    )}
                  </Button>
                </form>
              </Form>
            </Tabs>
          </CardContent>
          <CardFooter className="bg-black/20 p-4 text-center text-xs text-muted-foreground">
            <p className="w-full flex items-center justify-center gap-2">
              <Lock size={12} /> End-to-end encrypted communication (Concept)
            </p>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}
