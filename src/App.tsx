import { useState, useEffect, useRef } from "react";
import { Users, Activity, Heart, Calendar, MessageSquare, Send, Sparkles, RefreshCw, Settings, Plus, X } from "lucide-react";

type FamilyMember = {
  id: string;
  name: string;
  role: string;
  screenTimeHours: number;
  mood: string;
  avatar: string;
  timeFree?: string;
  description?: string;
};

export default function App() {
  const [members, setMembers] = useState<FamilyMember[]>([
    { id: "1", name: "Dad", role: "Parent", screenTimeHours: 4.5, mood: "Stressed", avatar: "👨" },
    { id: "2", name: "Mom", role: "Parent", screenTimeHours: 5.2, mood: "Busy", avatar: "👩" },
    { id: "3", name: "Alex", role: "Teenager", screenTimeHours: 8.5, mood: "Disconnected", avatar: "👦" },
    { id: "4", name: "Mia", role: "Kid", screenTimeHours: 2.0, mood: "Energetic", avatar: "👧" }
  ]);
  const [activeTab, setActiveTab] = useState<"dashboard" | "chat" | "planner" | "onboarding">("dashboard");
  const [selectedMember, setSelectedMember] = useState<string>("3"); // Default to Teenager
  const [demoMode, setDemoMode] = useState(false);

  // Simulated refresh for the dashboard
  const fetchMembers = async () => {
    try {
      const res = await fetch("/api/members");
      const contentType = res.headers.get("content-type");
      if (res.ok && contentType && contentType.includes("application/json")) {
        const data = await res.json();
        if (data && Array.isArray(data) && data.length > 0) {
           setMembers(data);
           setDemoMode(false);
           if (!data.find(m => m.id === selectedMember)) {
             setSelectedMember(data[0].id);
           }
        }
        return;
      }
      throw new Error("Invalid response or not JSON");
    } catch (err) {
      setDemoMode(true);
      // Just a fun mock refresh to make the hackathon demo feel "live" if backend is down
      const shuffled = [...members].map(m => ({
        ...m,
        screenTimeHours: parseFloat((m.screenTimeHours + (Math.random() > 0.5 ? 0.1 : 0)).toFixed(1))
      }));
      setMembers(shuffled);
    }
  };


  useEffect(() => {
    fetchMembers();
  }, []);

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-100 font-sans selection:bg-indigo-500/30">
      <header className="border-b border-neutral-800 bg-neutral-950/50 backdrop-blur-md sticky top-0 z-10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-indigo-400">
          <Heart className="w-6 h-6 fill-indigo-500" />
          <h1 className="text-xl font-semibold tracking-tight text-white">FamSync<span className="text-indigo-400 font-light">AI</span></h1>
        </div>
        <nav className="flex gap-1 bg-neutral-900 p-1 rounded-full border border-neutral-800 hidden md:flex">
          <TabButton active={activeTab === "dashboard"} onClick={() => setActiveTab("dashboard")} icon={<Activity className="w-4 h-4" />} label="Dashboard" />
          <TabButton active={activeTab === "chat"} onClick={() => setActiveTab("chat")} icon={<MessageSquare className="w-4 h-4" />} label="AI Chat" />
          <TabButton active={activeTab === "planner"} onClick={() => setActiveTab("planner")} icon={<Calendar className="w-4 h-4" />} label="Planner" />
          <TabButton active={activeTab === "onboarding"} onClick={() => setActiveTab("onboarding")} icon={<Settings className="w-4 h-4" />} label="Configure Family" />
        </nav>
        {/* Mobile quick config button */}
        <button onClick={() => setActiveTab("onboarding")} className="md:hidden p-2 text-neutral-400 hover:text-white bg-neutral-900 rounded-full border border-neutral-800">
           <Settings className="w-5 h-5"/>
        </button>
      </header>

      {demoMode && (
        <div className="bg-amber-500/20 border-b border-amber-500/30 text-amber-200 px-6 py-2.5 text-sm text-center flex flex-col md:flex-row items-center justify-center gap-2 z-20 relative">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>Running in <strong>Vercel Frontend-Only Mode</strong> (Backend Unreachable). Please redeploy with the new Vercel configs!</span>
        </div>
      )}

      <main className="max-w-5xl mx-auto p-6 md:p-8 mt-4">
        {activeTab === "dashboard" && <Dashboard members={members} onRefresh={fetchMembers} />}
        {activeTab === "chat" && <Chat members={members} selectedMember={selectedMember} onSelectMember={setSelectedMember} onMoodUpdated={fetchMembers} />}
        {activeTab === "planner" && <Planner />}
        {activeTab === "onboarding" && <Onboarding currentMembers={members} onSave={async (newMembers) => {
          setMembers(newMembers);
          setActiveTab("dashboard");
          if (demoMode) return; // Don't try to sync if offline
          try {
            await fetch("/api/members", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ members: newMembers })
            });
          } catch(e) {}
        }} />}
      </main>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
        active ? "bg-indigo-500/10 text-indigo-400" : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function Dashboard({ members, onRefresh }: { members: FamilyMember[], onRefresh: () => void }) {
  const getMoodColor = (mood: string) => {
    switch (mood.toLowerCase()) {
      case "stressed": return "text-red-400 bg-red-400/10 border-red-400/20";
      case "busy": return "text-orange-400 bg-orange-400/10 border-orange-400/20";
      case "disconnected": return "text-neutral-400 bg-neutral-400/10 border-neutral-400/20";
      case "energetic": return "text-green-400 bg-green-400/10 border-green-400/20";
      case "happy": return "text-emerald-400 bg-emerald-400/10 border-emerald-400/20";
      case "calm": return "text-blue-400 bg-blue-400/10 border-blue-400/20";
      default: return "text-indigo-400 bg-indigo-400/10 border-indigo-400/20";
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white">Family Overview</h2>
          <p className="text-neutral-400 mt-1">Live status of your family's digital wellbeing.</p>
        </div>
        <button onClick={onRefresh} className="p-2 text-neutral-400 hover:text-white rounded-full hover:bg-neutral-800 transition-colors">
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {members.map(member => (
          <div key={member.id} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 hover:border-neutral-700 transition-colors flex flex-col items-center text-center">
            <div className="text-4xl mb-3 bg-neutral-800 w-16 h-16 flex items-center justify-center rounded-full">
              {member.avatar}
            </div>
            <h3 className="text-lg font-medium text-white">{member.name}</h3>
            <span className="text-xs text-neutral-500 tracking-wider uppercase font-semibold mb-4">{member.role}</span>
            
            <div className={`px-3 py-1 rounded-full text-xs font-medium border mb-4 mt-auto ${getMoodColor(member.mood)}`}>
              Mood: {member.mood}
            </div>

            <div className="w-full bg-neutral-950 rounded-xl p-3 flex flex-col items-start text-sm">
              <span className="text-neutral-500 mb-1 flex items-center gap-1.5"><Activity className="w-3.5 h-3.5"/> Screen Time</span>
              <span className={`font-mono font-medium ${member.screenTimeHours > 4 ? "text-amber-400" : "text-neutral-300"}`}>
                {member.screenTimeHours} hrs
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Chat({ members, selectedMember, onSelectMember, onMoodUpdated }: { members: FamilyMember[], selectedMember: string, onSelectMember: (id: string) => void, onMoodUpdated: () => void }) {
  const [messages, setMessages] = useState<{sender: string, text: string}[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load chat history when member changes
  useEffect(() => {
    fetch(`/api/chat/${selectedMember}`)
      .then(res => {
        if (!res.headers.get("content-type")?.includes("application/json")) throw new Error("Not JSON");
        return res.json();
      })
      .then(data => setMessages(data))
      .catch((err) => {
        // Mock chat history based on selected member for frontend-only demo
        const mockChats: Record<string, {sender: string, text: string}[]> = {
          "1": [{ sender: "ai", text: "Hey Dad, I noticed your screen time is climbing. How are you feeling?" }],
          "2": [{ sender: "user", text: "I'm so busy today." }, { sender: "ai", text: "I hear you, Mom. Would you like me to find a quick 15-minute gap for you to rest?" }],
          "3": [{ sender: "ai", text: "Alex, you've been on your device a lot today. Everything okay?" }],
          "4": [{ sender: "ai", text: "Mia, want to plan a fun game for the family later?" }]
        };
        
        setMessages(mockChats[selectedMember] || []);
      });
  }, [selectedMember]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const activeMember = members.find(m => m.id === selectedMember);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !activeMember) return;

    const userText = input.trim();
    setInput("");
    setMessages(prev => [...prev, { sender: "user", text: userText }]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: activeMember.id, text: userText })
      });
      
      const contentType = res.headers.get("content-type");
      if (res.ok && contentType && contentType.includes("application/json")) {
        const data = await res.json();
        setMessages(prev => [...prev, { sender: "ai", text: data.reply }]);
        onMoodUpdated(); 
        setLoading(false);
        return;
      }
      throw new Error("Invalid API response format");
    } catch (err) {
      // Mock API delay and response for frontend-only demo
      setTimeout(() => {
        setMessages(prev => [...prev, { sender: "ai", text: `(Demo Mode) I hear what you're saying. Since this is a demo without the AI backend right now, I'll log your thoughts safely!` }]);
        setLoading(false);
        onMoodUpdated(); 
      }, 1500);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 h-[70vh] animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Sidebar */}
      <div className="md:col-span-1 border border-neutral-800 rounded-2xl bg-neutral-900/50 flex flex-col overflow-hidden hidden md:flex">
        <div className="p-4 border-b border-neutral-800">
          <h3 className="font-medium text-neutral-300 text-sm uppercase tracking-wider">Family Chat</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {members.map(member => (
            <button
              key={member.id}
              onClick={() => onSelectMember(member.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors ${
                selectedMember === member.id ? "bg-indigo-500/10 border-indigo-500/20 border text-indigo-100" : "hover:bg-neutral-800 text-neutral-400 border border-transparent"
              }`}
            >
              <span className="text-xl">{member.avatar}</span>
              <div>
                <div className="font-medium">{member.name}</div>
                <div className="text-xs opacity-70">{member.mood}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="md:col-span-3 border border-neutral-800 rounded-2xl bg-neutral-900 flex flex-col overflow-hidden">
        {/* Mobile Header (select member) - simplified for demo */}
        <div className="p-4 border-b border-neutral-800 flex items-center gap-4 bg-neutral-900/80 backdrop-blur-sm z-10">
          <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center text-xl">
             {activeMember?.avatar}
          </div>
          <div>
            <h2 className="font-medium text-white">Chatting as {activeMember?.name}</h2>
            <p className="text-xs text-indigo-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Sentiment Analysis Active
            </p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="flex flex-col items-center justify-center h-24 text-center space-y-2 mb-8 opacity-60">
             <div className="bg-neutral-800 p-3 rounded-full text-neutral-400"><MessageSquare className="w-5 h-5"/></div>
             <p className="text-sm">Type a message to see the AI analyze {activeMember?.name}'s mood.</p>
          </div>

          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
                msg.sender === "user" 
                  ? "bg-indigo-600 text-white rounded-br-sm" 
                  : "bg-neutral-800 text-neutral-200 rounded-bl-sm border border-neutral-700"
              }`}>
                {msg.text}
              </div>
            </div>
          ))}
          {loading && (
             <div className="flex justify-start">
              <div className="bg-neutral-800 text-neutral-400 border border-neutral-700 px-4 py-3 rounded-2xl rounded-bl-sm text-sm flex gap-1.5 items-center">
                 <span className="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-bounce"></span>
                 <span className="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-bounce" style={{animationDelay: '0.15s'}}></span>
                 <span className="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-bounce" style={{animationDelay: '0.3s'}}></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={sendMessage} className="p-4 border-t border-neutral-800 bg-neutral-900">
          <div className="relative flex items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="How are you feeling today?"
              className="w-full bg-neutral-950 border border-neutral-700 rounded-full py-3 pl-5 pr-12 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="absolute right-2 p-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-white rounded-full transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Planner() {
  const [recommendation, setRecommendation] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const generatePlan = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/plan", { method: "POST" });
      
      const contentType = res.headers.get("content-type");
      if (res.ok && contentType && contentType.includes("application/json")) {
        const data = await res.json();
        setRecommendation(data);
        setLoading(false);
        return;
      }
      throw new Error("Invalid API response format");
    } catch (err) {
      // Mock API delay and response for frontend-only demo
      setTimeout(() => {
        setRecommendation({
          title: "Demo: Family Board Game Night",
          rationale: "This is a demo recommendation since the AI backend is unreachable. It suggests board games provide a structured wait to interact!",
          duration: "1.5 hours",
          type: "Indoor"
        });
        setLoading(false);
      }, 2000);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center mb-10">
        <div className="w-16 h-16 bg-indigo-500/10 text-indigo-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-indigo-500/20">
          <Calendar className="w-8 h-8" />
        </div>
        <h2 className="text-3xl font-semibold text-white mb-3">AI Bonding Planner</h2>
        <p className="text-neutral-400">Our scheduling algorithm analyzes everyone's screen time and mood to find the perfect activity to reconnect.</p>
      </div>

      {!recommendation && !loading && (
        <div className="flex justify-center">
          <button 
            onClick={generatePlan}
            className="group relative px-6 py-3 bg-white text-black font-semibold rounded-full hover:scale-105 transition-all duration-200 flex items-center gap-2"
          >
            <Sparkles className="w-5 h-5 text-indigo-600 group-hover:animate-pulse" />
            Generate Family Plan
          </button>
        </div>
      )}

      {loading && (
        <div className="border border-neutral-800 bg-neutral-900 rounded-3xl p-8 flex flex-col items-center text-center space-y-4">
           <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
           <p className="text-neutral-400 animate-pulse">Running scheduling and preference algorithm...</p>
        </div>
      )}

      {recommendation && !loading && (
        <div className="border border-indigo-500/30 bg-indigo-500/5 rounded-3xl p-8 relative overflow-hidden animate-in zoom-in-95 duration-500">
          <div className="absolute top-0 right-0 p-4 opacity-10">
             <Heart className="w-32 h-32" />
          </div>
          
          {recommendation.error ? (
              <div className="text-red-400">{recommendation.error}</div>
          ) : (
            <div className="relative z-10 space-y-6">
              <div className="inline-block px-3 py-1 bg-indigo-500/20 text-indigo-300 text-xs font-semibold uppercase tracking-wider rounded-full border border-indigo-500/20">
                Matched Activity
              </div>
              
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">{recommendation.title}</h3>
                <div className="flex gap-3 text-sm text-neutral-400">
                  <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4"/> {recommendation.duration}</span>
                  <span className="flex items-center gap-1.5"><Users className="w-4 h-4"/> {recommendation.type}</span>
                </div>
              </div>

              <div className="bg-black/40 border border-neutral-800 rounded-2xl p-5 backdrop-blur-sm">
                <h4 className="text-sm font-medium text-indigo-300 mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" /> Why this works right now:
                </h4>
                <p className="text-neutral-300 leading-relaxed text-sm">
                  {recommendation.rationale}
                </p>
              </div>

              <div className="pt-4 flex gap-3">
                 <button className="flex-1 py-3 bg-white text-black font-medium rounded-xl hover:bg-neutral-200 transition-colors">
                   Schedule It
                 </button>
                 <button onClick={generatePlan} className="px-6 py-3 bg-neutral-800 text-white font-medium rounded-xl hover:bg-neutral-700 transition-colors border border-neutral-700">
                   Regenerate
                 </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Onboarding({ currentMembers, onSave }: { currentMembers: FamilyMember[], onSave: (members: FamilyMember[]) => void }) {
  const [editingMembers, setEditingMembers] = useState<FamilyMember[]>(currentMembers);

  const addMember = () => {
    if (editingMembers.length >= 8) return;
    setEditingMembers([...editingMembers, {
      id: Math.random().toString(36).substring(7),
      name: "",
      role: "Member",
      screenTimeHours: 0,
      mood: "Neutral",
      avatar: "👤",
      timeFree: "",
      description: ""
    }]);
  };

  const updateMember = (id: string, field: string, value: any) => {
    setEditingMembers(editingMembers.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  const removeMember = (id: string) => {
    setEditingMembers(editingMembers.filter(m => m.id !== id));
  };

  return (
    <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-white">Family Configuration</h2>
        <p className="text-neutral-400 mt-1">Add up to 8 members to personalize the AI assistant.</p>
      </div>

      <div className="space-y-4 mb-8">
        {editingMembers.map((member, i) => (
          <div key={member.id} className="p-4 bg-neutral-900 border border-neutral-800 rounded-2xl relative group">
            <button 
              onClick={() => removeMember(member.id)}
              className="absolute top-4 right-4 p-1.5 text-neutral-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-4 mb-4">
              <div className="text-3xl bg-neutral-800 w-12 h-12 flex items-center justify-center rounded-xl border border-neutral-700 cursor-pointer">
                {member.avatar}
              </div>
              <div className="flex-1 grid grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Name"
                  value={member.name}
                  onChange={(e) => updateMember(member.id, "name", e.target.value)}
                  className="bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
                <select
                  value={member.role}
                  onChange={(e) => updateMember(member.id, "role", e.target.value)}
                  className="bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  <option>Parent</option>
                  <option>Teenager</option>
                  <option>Kid</option>
                  <option>Grandparent</option>
                  <option>Member</option>
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm mt-3 border-t border-neutral-800 pt-3">
              <div>
                 <label className="block text-neutral-400 text-xs mb-1">Avg Screen Time (hrs)</label>
                 <input type="number" step="0.5" value={member.screenTimeHours} onChange={e => updateMember(member.id, "screenTimeHours", parseFloat(e.target.value) || 0)} className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                 <label className="block text-neutral-400 text-xs mb-1">Free Time (e.g. 6PM-8PM)</label>
                 <input type="text" placeholder="6PM-8PM" value={member.timeFree || ""} onChange={e => updateMember(member.id, "timeFree", e.target.value)} className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-indigo-500" />
              </div>
              <div className="col-span-2">
                 <label className="block text-neutral-400 text-xs mb-1">Short Description (for AI context)</label>
                 <input type="text" placeholder="Loves video games, studying for finals..." value={member.description || ""} onChange={e => updateMember(member.id, "description", e.target.value)} className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-indigo-500" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <button 
          onClick={addMember}
          disabled={editingMembers.length >= 8}
          className="flex items-center gap-2 px-4 py-2 border border-neutral-700 text-neutral-300 rounded-full text-sm font-medium hover:bg-neutral-800 disabled:opacity-50 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Member
        </button>
        
        <button 
          onClick={() => onSave(editingMembers)}
          className="px-6 py-2 bg-indigo-600 text-white rounded-full text-sm font-medium hover:bg-indigo-500 transition-colors"
        >
          Save & Sync
        </button>
      </div>
    </div>
  );
}
