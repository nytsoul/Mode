'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import Link from 'next/link'
import { MessageCircle, Send } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ChatListPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [chats, setChats] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [targetEmail, setTargetEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [targetId, setTargetId] = useState<string | null>(null)
  const [requesting, setRequesting] = useState(false)
  const [verifying, setVerifying] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user) {
      fetchChats()
    }
  }, [user])

  const fetchChats = async () => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
      const response = await axios.get(`${API_URL}/api/chat`)
      setChats(response.data.chats || [])
    } catch (error) {
      console.error('Failed to fetch chats:', error)
      toast.error('Failed to load chats')
    } finally {
      setLoading(false)
    }
  }

  const requestOtp = async () => {
    if (!targetEmail.trim()) return toast.error('Enter an email')
    setRequesting(true)
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
      const res = await axios.post(`${API_URL}/api/chat/request-otp`, { email: targetEmail })
      setTargetId(res.data.targetId)
      // If backend returned OTP for dev, pre-fill it so testing is easier
      if (res.data.otp) {
        setOtp(res.data.otp)
        toast.success(`OTP (dev): ${res.data.otp}`)
      } else {
        toast.success('OTP requested. The target user will receive the OTP via email (or it will be logged during dev).')
      }
    } catch (err: any) {
      console.error('request otp error', err)
      toast.error(err.response?.data?.message || 'Failed to request OTP')
    } finally {
      setRequesting(false)
    }
  }

  const verifyOtpAndOpen = async () => {
    if (!targetId) return toast.error('No target selected')
    if (!otp.trim()) return toast.error('Enter OTP')
    setVerifying(true)
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
      const res = await axios.post(`${API_URL}/api/chat/verify-otp`, { targetId, otp })
      const chat = res.data.chat
      if (chat && chat._id) {
        router.push(`/chat/${chat._id}`)
      } else {
        toast.error('Failed to open chat')
      }
    } catch (err: any) {
      console.error('verify otp error', err)
      toast.error(err.response?.data?.message || 'OTP verification failed')
    } finally {
      setVerifying(false)
    }
  }

  if (authLoading || loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  if (!user) {
    return null
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Your Chats</h1>

      <div className="mb-6">
        <button
          onClick={() => setShowNew(true)}
          className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700"
        >
          Start New Conversation
        </button>
      </div>

      {chats.length === 0 ? (
        <div className="text-center py-12">
          <MessageCircle className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 dark:text-gray-400">No chats yet. Start a conversation with a match!</p>
          <Link
            href="/matches"
            className="mt-4 inline-block px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Find Matches
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {chats.map((chat: any) => {
            const otherParticipant = chat.participants?.find(
              (p: any) => p._id !== user.id
            )
            return (
              <Link
                key={chat._id}
                href={`/chat/${chat._id}`}
                className="block bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {otherParticipant?.profilePhotos?.[0] && (
                      <img
                        src={otherParticipant.profilePhotos[0]}
                        alt={otherParticipant.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    )}
                    <div>
                      <h3 className="font-semibold text-lg">{otherParticipant?.name || 'Unknown'}</h3>
                      {chat.lastMessage && (
                        <p className="text-gray-600 dark:text-gray-400 text-sm truncate max-w-md">
                          {chat.lastMessage.content}
                        </p>
                      )}
                    </div>
                  </div>
                  {chat.lastMessageAt && (
                    <span className="text-sm text-gray-500">
                      {new Date(chat.lastMessageAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {/* New conversation modal (simple) */}
      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowNew(false)} />
          <div className="relative z-10 w-full max-w-md p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Start Conversation</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">Enter the other user's email. An OTP will be sent to them; once they provide it, verify here to open the chat.</p>

            <label className="block text-sm text-gray-700 dark:text-gray-300">Email</label>
            <input value={targetEmail} onChange={(e) => setTargetEmail(e.target.value)} className="w-full px-3 py-2 rounded bg-gray-100 dark:bg-gray-700 dark:text-white border border-gray-300 dark:border-gray-600 mb-3" placeholder="their@example.com" />
            <div className="flex gap-2 mb-3">
              <button onClick={requestOtp} disabled={requesting} className="px-4 py-2 bg-pink-600 text-white rounded disabled:opacity-50">{requesting ? 'Requesting...' : 'Request OTP'}</button>
              <button onClick={() => { setTargetEmail(''); setTargetId(null); setOtp('') }} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded">Reset</button>
            </div>

            {targetId && (
              <div>
                <label className="block text-sm text-gray-700 dark:text-gray-300">Enter OTP</label>
                <input value={otp} onChange={(e) => setOtp(e.target.value)} className="w-full px-3 py-2 rounded bg-gray-100 dark:bg-gray-700 dark:text-white border border-gray-300 dark:border-gray-600 mb-3" placeholder="123456" />
                <div className="flex justify-end gap-2">
                  <button onClick={() => setShowNew(false)} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded">Cancel</button>
                  <button onClick={verifyOtpAndOpen} disabled={verifying} className="px-4 py-2 bg-pink-600 text-white rounded disabled:opacity-50">{verifying ? 'Verifying...' : 'Verify & Open Chat'}</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

