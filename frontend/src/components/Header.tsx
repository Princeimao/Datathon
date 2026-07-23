import { Sparkles } from 'lucide-react'
import React from 'react'

const Header = ({active}: {active: any}) => {
  return (
    <header className="sticky top-0 z-30 border-b border-green-100 bg-white/80 backdrop-blur-xl px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs text-green-600">
                <Sparkles size={14} />
                <span>Crime Intelligence & Analytical Platform</span>
              </div>
              <h2 className="mt-0.5 text-2xl font-semibold text-green-950 tracking-tight">{active?.label}</h2>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse-ring" />
                <span className="text-xs text-green-700 font-medium">System Online</span>
              </div>
              <div className="h-9 w-9 rounded-full bg-green-700 grid place-items-center text-white text-sm font-semibold">
                KP
              </div>
            </div>
          </div>
        </header>
  )
}

export default Header