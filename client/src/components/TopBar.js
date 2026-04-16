import { Menu, MoreVertical } from 'lucide-react';
import { motion } from 'framer-motion';

export function TopBar({ onMenuClick, room }) {
  // Room ID ab dynamic props se aayegi
  const currentRoomId = room || "Join a Room";

  return (
    <div className="sticky top-0 z-30 bg-gradient-to-br from-white/10 via-white/5 to-white/10 backdrop-blur-xl border-b border-white/20">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Hamburger Menu - Mobile Toggle */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onMenuClick}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors active:bg-white/20"
        >
          <Menu className="w-6 h-6 text-cyan-400" strokeWidth={2} />
        </motion.button>

        {/* Room ID - Center */}
        <div className="flex-1 flex justify-center px-2">
          <div className="bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-400/30 rounded-lg px-3 py-1.5">
            <code className="text-xs font-['Outfit',sans-serif] font-semibold text-cyan-400">
              {currentRoomId}
            </code>
          </div>
        </div>

        {/* Actions */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors active:bg-white/20"
        >
          <MoreVertical className="w-6 h-6 text-gray-400" strokeWidth={2} />
        </motion.button>
      </div>
    </div>
  );
}