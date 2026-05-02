import { Menu, MoreVertical } from 'lucide-react';
import { motion } from 'framer-motion';

export function TopBar({ onMenuClick, room, theme }) {
  const isDark = theme === 'dark';
  const currentRoomId = room || "Join a Room";

  return (
    <div
      className="sticky top-0 z-30 border-b"
      style={isDark
        ? { background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(20px)', borderColor: 'rgba(255,255,255,0.15)' }
        : { background: '#ffffff', borderColor: '#e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }
      }
    >
      <div className="flex items-center justify-between px-4 py-3">
        {/* Hamburger */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onMenuClick}
          className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-slate-100'}`}
        >
          <Menu className={`w-6 h-6 ${isDark ? 'text-cyan-400' : 'text-blue-500'}`} strokeWidth={2} />
        </motion.button>

        {/* Room ID */}
        <div className="flex-1 flex justify-center px-2">
          <div
            className="rounded-lg px-3 py-1.5"
            style={isDark
              ? { background: 'linear-gradient(90deg,rgba(34,211,238,0.15),rgba(59,130,246,0.15))', border: '1px solid rgba(34,211,238,0.25)' }
              : { background: '#eff6ff', border: '1px solid #bfdbfe' }
            }
          >
            <code className={`text-xs font-semibold font-['Outfit',sans-serif] ${isDark ? 'text-cyan-400' : 'text-blue-600'}`}>
              {currentRoomId}
            </code>
          </div>
        </div>

        {/* Options */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-slate-100'}`}
        >
          <MoreVertical className={`w-6 h-6 ${isDark ? 'text-gray-400' : 'text-slate-400'}`} strokeWidth={2} />
        </motion.button>
      </div>
    </div>
  );
}