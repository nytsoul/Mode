"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Heart, Users } from 'lucide-react'

export default function SelectModePage() {
  const router = useRouter()
  const [mode, setMode] = useState<'love' | 'friends'>('love')

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-black py-12 px-4">
      <div className="max-w-lg w-full">
        <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-lg p-8 text-center">
          <h1 className="text-3xl font-bold text-white mb-4">Choose Mode for Quiz</h1>
          <p className="text-sm text-gray-400 mb-6">Select which mode the quiz should use for recommendations and questions.</p>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <button
              onClick={() => setMode('love')}
              className={`p-6 rounded-xl border ${mode === 'love' ? 'border-pink-500 bg-gradient-to-br from-pink-700 to-pink-600 text-white shadow-lg' : 'border-gray-700 bg-gray-800 text-gray-200'}`}>
              <div className="text-4xl mb-2">❤️</div>
              <div className="font-semibold">Love Mode</div>
            </button>

            <button
              onClick={() => setMode('friends')}
              className={`p-6 rounded-xl border ${mode === 'friends' ? 'border-indigo-500 bg-gradient-to-br from-indigo-700 to-indigo-600 text-white shadow-lg' : 'border-gray-700 bg-gray-800 text-gray-200'}`}>
              <div className="text-4xl mb-2">👥</div>
              <div className="font-semibold">Friends Mode</div>
            </button>
          </div>

          <div className="flex gap-3 justify-center">
            <button
              onClick={() => router.push(`/ai/quiz?mode=${mode}`)}
              className="px-6 py-3 bg-pink-600 text-white rounded-lg hover:bg-pink-700"
            >
              Start Quiz
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
