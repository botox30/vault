import { Link } from "wouter";
import { LogOut, UserPlus, Users, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function Sidebar() {
  const { user, logout } = useAuth();
  
  return (
    <div className="w-[72px] h-full bg-sidebar flex flex-col items-center py-4 gap-4 z-50 shadow-xl">
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <div className="w-12 h-12 bg-primary rounded-[16px] flex items-center justify-center text-primary-foreground font-bold text-xl shadow-lg transition-all hover:rounded-[12px] hover:bg-primary/90 cursor-pointer">
            V
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" className="bg-black text-white border-0 font-semibold">
          Vault Home
        </TooltipContent>
      </Tooltip>

      <div className="w-8 h-[2px] bg-white/10 rounded-full my-2" />

      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <Link href="/" className={cn(
            "w-12 h-12 rounded-[24px] flex items-center justify-center transition-all hover:rounded-[16px] hover:bg-primary hover:text-white bg-card text-green-500"
          )}>
            <MessageSquare size={24} />
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right" className="bg-black text-white border-0 font-semibold">
          Chats
        </TooltipContent>
      </Tooltip>
      
      <div className="flex-1" />
      
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <div className="relative group cursor-pointer">
            <Avatar className="w-12 h-12 transition-transform group-hover:scale-105 border-2 border-transparent group-hover:border-primary">
              <AvatarFallback className="bg-muted text-muted-foreground font-semibold">
                {user?.username.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-sidebar" />
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" className="bg-black text-white border-0 font-semibold">
          {user?.username}
        </TooltipContent>
      </Tooltip>

      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className="w-12 h-12 rounded-[24px] hover:rounded-[16px] hover:bg-destructive hover:text-white text-muted-foreground"
            onClick={() => logout.mutate()}
          >
            <LogOut size={20} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right" className="bg-black text-white border-0 font-semibold">
          Logout
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
