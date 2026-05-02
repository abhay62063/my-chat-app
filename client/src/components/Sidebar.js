import { motion } from 'framer-motion';
import { LogOut, X, Shield } from 'lucide-react';

export function Sidebar({ isOpen, onClose, isMobile, room, username, members, theme }) {
  const isDark = theme === 'dark';
  const currentRoomId = room || "No Room Joined";
  const onlineCount = members ? members.length : 0;

  const sidebarContent = (
    <div
      className="h-full flex flex-col border-r"
      style={isDark
        ? { background: 'rgba(10,10,30,0.92)', backdropFilter: 'blur(24px)', borderColor: 'rgba(255,255,255,0.1)' }
        : { background: '#ffffff', borderColor: '#e2e8f0' }
      }
    >
      {/* Header */}
      <div className="p-4 sm:p-6 border-b" style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0' }}>
        {/* GhostLink logo at top of sidebar */}
        <div className="mb-4 flex items-center justify-between">
          <span
            className="ghostlink-logo"
            style={{ fontSize: '1.1rem' }}
          >
            GhostLink
          </span>

          {isMobile && (
            <button
              onClick={onClose}
              className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-white/5' : 'hover:bg-slate-100'}`}
            >
              <X className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-slate-400'}`} />
            </button>
          )}
        </div>

        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-4 h-4 text-cyan-500" strokeWidth={2} />
              <span className={`text-[10px] font-medium tracking-wider uppercase ${isDark ? 'text-cyan-400/70' : 'text-blue-500/70'}`}>
                Room ID
              </span>
            </div>
            <div
              className="rounded-lg px-3 py-2 inline-block"
              style={isDark
                ? { background: 'rgba(34,211,238,0.08)', border: '1px solid rgba(34,211,238,0.2)' }
                : { background: '#eff6ff', border: '1px solid #bfdbfe' }
              }
            >
              <code className={`text-sm font-semibold ${isDark ? 'text-cyan-300' : 'text-blue-600'}`}>
                {currentRoomId}
              </code>
            </div>
          </div>
        </div>


        {/* Online Count */}
        <div className="flex items-center gap-2 mt-4">
          <div className="relative w-2.5 h-2.5">
            <div className={`w-full h-full rounded-full ${onlineCount > 0 ? 'bg-green-400' : 'bg-gray-400'}`} />
            {onlineCount > 0 && (
              <div className="absolute inset-0 bg-green-400 rounded-full animate-ping opacity-75" />
            )}
          </div>
          <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-slate-500'}`}>
            <span className={`font-semibold ${onlineCount > 0 ? 'text-green-400' : 'text-gray-400'}`}>{onlineCount}</span> online
          </span>
        </div>
      </div>

      {/* Members List */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
        {members && members.length > 0 ? (
          members.map((member) => (
            <div
              key={member.id}
              className="flex items-center gap-3 p-3 rounded-xl transition-colors"
              style={isDark
                ? { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }
                : { background: '#f8fafc', border: '1px solid #e2e8f0' }
              }
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg"
                style={isDark
                  ? { background: 'linear-gradient(135deg,rgba(34,211,238,0.3),rgba(59,130,246,0.3))', border: '1px solid rgba(34,211,238,0.5)', color: 'white' }
                  : { background: 'linear-gradient(135deg,#bfdbfe,#ddd6fe)', border: '1px solid #93c5fd', color: '#1e40af' }
                }
              >
                {member.username ? member.username[0].toUpperCase() : '?'}
              </div>
              <div>
                <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-slate-700'}`}>
                  {member.username} {member.username === username ? "(You)" : ""}
                </p>
                <p className="text-[10px] text-green-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full" /> online
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-10">
            <p className={`text-xs italic ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>No members yet</p>
          </div>
        )}
      </div>

      {/* Leave Button */}
      <div className="p-4 sm:p-6 border-t" style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0' }}>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => window.location.reload()}
          className="w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}
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
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
          />
        )}
        <motion.div
          initial={{ x: '-100%' }}
          animate={{ x: isOpen ? 0 : '-100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed top-0 left-0 bottom-0 w-[300px] z-50"
        >
          {sidebarContent}
        </motion.div>
      </>
    )
    : <div className="w-80 h-full">{sidebarContent}</div>;
}