import { motion } from 'framer-motion';
import { LogOut, X, Shield } from 'lucide-react';

export function Sidebar({ isOpen, onClose, isMobile, room, username, members }) {
  // Room ID handle karein
  const currentRoomId = room || "No Room Join";
  
  // Dynamic online count jo members list ki length se aayega
  const onlineCount = members ? members.length : 0;

  const sidebarContent = (
    <div className="h-full flex flex-col bg-[#0a0a1e]/90 backdrop-blur-3xl border-r border-white/10">
      <div className="p-4 sm:p-6 border-b border-white/10">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-4 h-4 text-cyan-400" strokeWidth={2} />
              <span className="text-[10px] text-cyan-400/70 font-medium tracking-wider uppercase">
                Room ID
              </span>
            </div>
            <div className="bg-cyan-500/10 border border-cyan-400/20 rounded-lg px-3 py-2 inline-block">
              <code className="text-sm font-semibold text-cyan-300">
                {currentRoomId}
              </code>
            </div>
          </div>
          {isMobile && (
            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          )}
        </div>
        
        <div className="flex items-center gap-2 mt-4">
          <div className="relative w-2.5 h-2.5">
            <div className={`w-full h-full rounded-full ${onlineCount > 0 ? 'bg-green-400' : 'bg-gray-500'}`} />
            {onlineCount > 0 && (
              <div className="absolute inset-0 bg-green-400 rounded-full animate-ping opacity-75" />
            )}
          </div>
          <span className="text-sm text-gray-300">
            <span className={`font-semibold ${onlineCount > 0 ? 'text-green-400' : 'text-gray-500'}`}>{onlineCount}</span> online
          </span>
        </div>
      </div>

      {/* Dynamic Members List */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
        {members && members.length > 0 ? (
          members.map((member) => (
            <div key={member.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500/30 to-blue-500/30 border border-cyan-400/50 flex items-center justify-center font-bold text-lg text-white">
                {/* Agar username hai toh uska pehla letter, warna '?' */}
                {member.username ? member.username[0].toUpperCase() : '?'}
              </div>
              <div>
                <p className="text-sm font-medium text-white">
                    {member.username} {member.username === username ? "(You)" : ""}
                </p>
                <p className="text-[10px] text-green-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span> online
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-10">
            <p className="text-xs text-gray-500 italic">No members found</p>
          </div>
        )}
      </div>

      <div className="p-4 sm:p-6 border-t border-white/10">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => window.location.reload()}
          className="w-full py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 font-semibold flex items-center justify-center gap-2 hover:bg-red-500/20 transition-all shadow-lg shadow-red-500/10"
        >
          <LogOut className="w-4 h-4" />
          Leave Room
        </motion.button>
      </div>
    </div>
  );

  return isMobile 
    ? (
      <>
        {isOpen && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40" />}
        <motion.div initial={{ x: '-100%' }} animate={{ x: isOpen ? 0 : '-100%' }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} className="fixed top-0 left-0 bottom-0 w-[300px] z-50">
          {sidebarContent}
        </motion.div>
      </>
    ) 
    : <div className="w-80 h-full">{sidebarContent}</div>;
}