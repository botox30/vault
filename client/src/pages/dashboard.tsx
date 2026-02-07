import { useState, useRef, useEffect } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { useFriends } from "@/hooks/use-friends";
import { useChat } from "@/hooks/use-chat";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  UserPlus, 
  MessageSquare, 
  Send, 
  Search, 
  MoreVertical, 
  Check, 
  X,
  Hash,
  Smile,
  Users
} from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const { user } = useAuth();
  const { friends, requests, sendRequest, acceptRequest, rejectRequest } = useFriends();
  const { messages, sendMessage, connected } = useChat();
  
  const [selectedFriendId, setSelectedFriendId] = useState<number | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [addFriendInput, setAddFriendInput] = useState("");
  const [activeTab, setActiveTab] = useState<"friends" | "pending">("friends");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const selectedFriend = friends.find(f => f.friend.id === selectedFriendId);
  const currentMessages = selectedFriendId ? (messages[selectedFriendId] || []) : [];

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [currentMessages, selectedFriendId]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedFriendId) return;
    sendMessage(selectedFriendId, messageInput);
    setMessageInput("");
  };

  const handleAddFriend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addFriendInput.trim()) return;
    sendRequest.mutate(addFriendInput);
    setAddFriendInput("");
  };

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      {/* Navigation Sidebar */}
      <Sidebar />

      {/* Friends & Channels List */}
      <div className="w-80 bg-[#2B2D31] flex flex-col border-r border-black/10">
        {/* Header Search */}
        <div className="h-12 shadow-sm flex items-center px-4 border-b border-black/20">
          <Button 
            variant="outline" 
            className="w-full justify-start text-muted-foreground bg-[#1E1F22] border-0 h-7 text-sm px-2 font-normal"
          >
            <Search className="mr-2 h-3 w-3" />
            Find or start a conversation
          </Button>
        </div>

        {/* Tab Selection */}
        <div className="p-4 pb-2">
          <div className="flex items-center justify-between mb-4">
             <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Direct Messages</h2>
             <Button variant="ghost" size="icon" className="h-4 w-4 text-muted-foreground hover:text-foreground">
               <UserPlus className="h-4 w-4" />
             </Button>
          </div>
          
          <div className="space-y-1">
             <Button 
               variant={activeTab === "friends" ? "secondary" : "ghost"} 
               className="w-full justify-start mb-1"
               onClick={() => setActiveTab("friends")}
             >
               <Users className="mr-2 h-4 w-4" />
               Friends
             </Button>
             <div className="relative">
                <Button 
                  variant={activeTab === "pending" ? "secondary" : "ghost"} 
                  className="w-full justify-start"
                  onClick={() => setActiveTab("pending")}
                >
                  <div className="mr-2 relative">
                    <UserPlus className="h-4 w-4" />
                    {requests.length > 0 && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    )}
                  </div>
                  Pending Requests
                </Button>
                {requests.length > 0 && (
                  <span className="absolute right-2 top-2 bg-red-500 text-white text-[10px] font-bold px-1.5 rounded-full">
                    {requests.length}
                  </span>
                )}
             </div>
          </div>
        </div>

        <Separator className="bg-white/5 mx-2 mb-2 w-auto" />

        {/* List Content */}
        <ScrollArea className="flex-1 px-2">
          {activeTab === "friends" ? (
            <div className="space-y-1 p-2">
              {friends.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <p>No friends yet.</p>
                  <p className="text-xs mt-1 opacity-70">Add some to start chatting!</p>
                </div>
              ) : (
                friends.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setSelectedFriendId(f.friend.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all group",
                      selectedFriendId === f.friend.id 
                        ? "bg-[#404249] text-white" 
                        : "text-muted-foreground hover:bg-[#35373C] hover:text-gray-200"
                    )}
                  >
                    <div className="relative">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary/20 text-primary text-xs">
                          {f.friend.username.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-[#2B2D31]" />
                    </div>
                    <span className="font-medium truncate">{f.friend.username}</span>
                  </button>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-4 p-4">
              {/* Add Friend Input */}
              <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                <h3 className="text-sm font-semibold mb-2">Add Friend</h3>
                <form onSubmit={handleAddFriend} className="flex gap-2">
                  <Input 
                    placeholder="Username#0000" 
                    value={addFriendInput}
                    onChange={(e) => setAddFriendInput(e.target.value)}
                    className="h-8 bg-[#1E1F22] border-0 text-sm"
                  />
                  <Button 
                    type="submit" 
                    size="sm" 
                    className="h-8 bg-green-600 hover:bg-green-700"
                    disabled={!addFriendInput.trim() || sendRequest.isPending}
                  >
                    {sendRequest.isPending ? "..." : "Add"}
                  </Button>
                </form>
              </div>

              {/* Pending Requests List */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-muted-foreground uppercase">Pending - {requests.length}</h3>
                {requests.map((req) => (
                  <div key={req.id} className="flex items-center justify-between bg-black/10 p-2 rounded-md border border-white/5 hover:border-white/10 transition-colors">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">{req.fromUser.username.slice(0, 2)}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">{req.fromUser.username}</span>
                    </div>
                    <div className="flex gap-1">
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-7 w-7 text-green-500 hover:bg-green-500/10 hover:text-green-400"
                        onClick={() => acceptRequest.mutate(req.id)}
                      >
                        <Check size={14} />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-7 w-7 text-red-500 hover:bg-red-500/10 hover:text-red-400"
                        onClick={() => rejectRequest.mutate(req.id)}
                      >
                        <X size={14} />
                      </Button>
                    </div>
                  </div>
                ))}
                {requests.length === 0 && (
                  <p className="text-xs text-muted-foreground italic">No pending requests</p>
                )}
              </div>
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-[#313338] min-w-0">
        {selectedFriend ? (
          <>
            {/* Chat Header */}
            <div className="h-12 flex items-center justify-between px-4 border-b border-black/20 shadow-sm bg-[#313338]">
              <div className="flex items-center gap-2">
                <Hash className="text-muted-foreground h-5 w-5" />
                <span className="font-bold text-white">{selectedFriend.friend.username}</span>
                <span className="w-2 h-2 rounded-full bg-green-500 ml-2" />
              </div>
              <div className="flex gap-2 text-muted-foreground">
                <Search className="h-5 w-5 cursor-pointer hover:text-white" />
                <MoreVertical className="h-5 w-5 cursor-pointer hover:text-white" />
              </div>
            </div>

            {/* Messages Area */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {/* Welcome Message at top of history */}
                <div className="mt-4 mb-8 space-y-2">
                  <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                    <Hash className="w-10 h-10 text-primary" />
                  </div>
                  <h1 className="text-3xl font-bold">Welcome to the beginning of your chat with {selectedFriend.friend.username}.</h1>
                  <p className="text-muted-foreground">This is the start of your legendary conversation.</p>
                </div>
                
                <Separator className="bg-white/5 my-4" />

                <AnimatePresence initial={false}>
                  {currentMessages.map((msg, index) => {
                    const isSelf = msg.fromUserId === user?.id;
                    const showHeader = index === 0 || currentMessages[index-1].fromUserId !== msg.fromUserId || (new Date(msg.timestamp).getTime() - new Date(currentMessages[index-1].timestamp).getTime() > 60000);
                    
                    return (
                      <motion.div 
                        key={msg.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn(
                          "group flex gap-3 pr-4 hover:bg-black/5 -mx-4 px-4 py-1",
                          showHeader ? "mt-4" : "mt-0.5"
                        )}
                      >
                        {showHeader ? (
                          <Avatar className="w-10 h-10 mt-0.5 cursor-pointer hover:drop-shadow-md transition-all">
                            <AvatarFallback className={isSelf ? "bg-primary text-white" : "bg-orange-500 text-white"}>
                              {(isSelf ? user?.username : selectedFriend.friend.username).substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          <div className="w-10 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 text-right select-none pt-1">
                            {format(new Date(msg.timestamp), 'h:mm a')}
                          </div>
                        )}
                        
                        <div className="flex-1 min-w-0">
                          {showHeader && (
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold hover:underline cursor-pointer text-white">
                                {isSelf ? user?.username : selectedFriend.friend.username}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(msg.timestamp), 'MM/dd/yyyy h:mm a')}
                              </span>
                            </div>
                          )}
                          <p className={cn("text-[0.95rem] leading-[1.375rem] whitespace-pre-wrap text-gray-100", 
                            !showHeader && "opacity-90"
                          )}>
                            {msg.text}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="p-4 pt-0">
              <form 
                onSubmit={handleSendMessage}
                className="bg-[#383A40] rounded-lg px-4 py-2.5 flex items-center gap-3"
              >
                <button type="button" className="text-muted-foreground hover:text-gray-200 p-1">
                  <div className="w-5 h-5 rounded-full bg-muted-foreground flex items-center justify-center text-[#383A40] font-bold text-xs">+</div>
                </button>
                <input
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder={`Message @${selectedFriend.friend.username}`}
                  className="flex-1 bg-transparent border-0 outline-none text-gray-200 placeholder:text-muted-foreground/70"
                />
                <button type="button" className="text-muted-foreground hover:text-gray-200">
                  <Smile className="w-6 h-6" />
                </button>
                {messageInput.trim() && (
                   <button type="submit" className="text-primary hover:text-primary/80 transition-colors">
                     <Send className="w-5 h-5" />
                   </button>
                )}
              </form>
              <div className="text-[10px] text-center mt-1 text-muted-foreground">
                {connected ? "Connected to secure server" : "Connecting..."}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4">
            <div className="w-24 h-24 bg-[#2B2D31] rounded-full flex items-center justify-center mb-4 shadow-xl">
               <MessageSquare className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-bold text-muted-foreground">No Chat Selected</h2>
            <p className="text-muted-foreground max-w-xs">
              Select a friend from the sidebar or add a new friend to start chatting anonymously.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
