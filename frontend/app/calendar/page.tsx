'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { Calendar as CalendarIcon, Plus, Download, X } from 'lucide-react'
import toast from 'react-hot-toast'

// If using shadcn/ui dialog, ensure you've generated it: npx shadcn-ui@latest add dialog
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded px-3 py-2 text-sm border ${
        props.className ?? 'border-gray-300 bg-white text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white'
      } focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-pink-200 dark:focus:ring-pink-900`}
    />
  )
}
function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full rounded px-3 py-2 text-sm border ${
        props.className ?? 'border-gray-300 bg-white text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white'
      } focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-pink-200 dark:focus:ring-pink-900`}
    />
  )
}
function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full rounded px-3 py-2 text-sm border ${
        props.className ?? 'border-gray-300 bg-white text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white'
      } focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-indigo-200 dark:focus:ring-indigo-800`}
    />
  )
}
function Button(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`px-4 py-2 rounded text-sm font-medium ${props.className ?? ''} focus:outline-none focus:ring-2 focus:ring-offset-0`}
    />
  )
}

type CalendarEvent = {
  _id?: string
  title: string
  date: string
  type: 'PERSONAL' | 'WORK' | 'REMINDER' | 'JOURNAL' | 'EVENT'
  color?: string
  description?: string
  imageUrl?: string
}

export default function CalendarPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)

  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<CalendarEvent>({
    title: '',
    date: new Date().toISOString().slice(0, 10),
    type: 'PERSONAL',
    color: '#f472b6',
    description: '',
  })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview)
    }
  }, [imagePreview])
  const [dailyNote, setDailyNote] = useState('')

  const apiBase = process.env.NEXT_PUBLIC_API_URL

  useEffect(() => {
    if (!authLoading && !user) router.push('/login')
  }, [user, authLoading, router])

  useEffect(() => {
    if (user) fetchEvents()
  }, [user])

  const fetchEvents = async () => {
    try {
      const response = await axios.get(`${apiBase}/api/calendar`)
      setEvents(response.data.events || [])
    } catch (error) {
      console.error('Failed to fetch events:', error)
      toast.error('Failed to load calendar')
    } finally {
      setLoading(false)
    }
  }

  // Compare dates safely via YYYY-MM-DD
  const ymd = (d: Date | string) => new Date(d).toISOString().slice(0, 10)

  const todayISO = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const hasTodayEntry = useMemo(() => {
    return events.some(e => ymd(e.date) === todayISO)
  }, [events, todayISO])

  // Auto-insert default JOURNAL if no entry exists today
  useEffect(() => {
    if (!loading && user && !hasTodayEntry) {
      createEvent(
        {
          title: 'Today – sad day 😢',
          date: new Date().toISOString(),
          type: 'JOURNAL',
          description: 'Auto-note: Important moment not entered today.',
        },
        { silentSuccess: true }
      )
    }
  }, [loading, user, hasTodayEntry])

  // Map UI types to server-accepted types
  const mapTypeToServer = (t: CalendarEvent['type']) => {
    switch (t) {
      case 'REMINDER':
        return 'reminder'
      case 'JOURNAL':
        return 'event'
      case 'PERSONAL':
      case 'WORK':
      case 'EVENT':
      default:
        return 'event'
    }
  }

  const createEvent = async (payload: CalendarEvent, opts?: { silentSuccess?: boolean }) => {
    try {
      const serverPayload = {
        title: payload.title,
        date: payload.date,
        type: mapTypeToServer(payload.type),
        color: payload.color,
        description: payload.description,
      }
      await axios.post(`${apiBase}/api/calendar`, serverPayload)
      if (!opts?.silentSuccess) toast.success('Event added')
      fetchEvents()
      return true
    } catch (e: any) {
      if (e?.response?.data?.errors) {
        const first = e.response.data.errors[0]
        toast.error(first?.msg || 'Failed to add event')
      } else {
        toast.error('Failed to add event')
      }
      return false
    }
  }

  const onSubmitAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    const finalDescription = [form.description, dailyNote ? `Daily note: ${dailyNote}` : '']
      .filter(Boolean)
      .join('\n')
    const ok = await createEvent({ ...form, description: finalDescription || undefined })
    if (ok) {
      setOpen(false)
      // optimistic UI: add local event with preview image if present
      if (imagePreview) {
        setEvents(prev => [
          {
            _id: `local-${Date.now()}`,
            title: form.title || 'Untitled',
            date: form.date,
            type: form.type,
            color: form.color,
            description: finalDescription || undefined,
            imageUrl: imagePreview,
          },
          ...prev,
        ])
      }

      setForm({
        title: '',
        date: new Date().toISOString().slice(0, 10),
        type: 'PERSONAL',
        color: '#f472b6',
        description: '',
      })
      setImageFile(null)
      setImagePreview(null)
      setDailyNote('')
    }
  }

  const exportCalendar = async () => {
    try {
      const response = await axios.get(`${apiBase}/api/calendar/export`, {
        responseType: 'blob',
      })
      const blob = new Blob([response.data], { type: 'text/calendar;charset=utf-8' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'loves-calendar.ics')
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      toast.success('Calendar exported!')
    } catch (error) {
      toast.error('Failed to export calendar')
    }
  }

  const downloadImage = async (url: string, filename = 'image') => {
    try {
      const res = await fetch(url)
      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(blobUrl)
    } catch (error) {
      console.error('Download failed', error)
      toast.error('Failed to download image')
    }
  }

  if (authLoading || loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }
  if (!user) return null

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <CalendarIcon className="w-8 h-8" />
          Calendar
        </h1>
        <div className="flex gap-2">
          <Button
            onClick={exportCalendar}
            className="bg-gray-500 text-white hover:bg-gray-600 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export
          </Button>
          <Button
            onClick={() => setOpen(true)}
            className="bg-pink-500 text-white hover:bg-pink-600 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Event
          </Button>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-lg shadow">
          <CalendarIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 dark:text-gray-400">No events yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((event) => (
            <div key={event._id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 flex items-start gap-4">
              <div className="flex-shrink-0 mt-1">
                <div
                  className="w-3 h-8 rounded-md"
                  style={{ background: event.color || '#f472b6' }}
                />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold mb-2">{event.title}</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {new Date(event.date).toLocaleDateString()} - {event.type}
                </p>
                {event.description && (
                  <p className="text-gray-500 dark:text-gray-400 mt-2 whitespace-pre-line">{event.description}</p>
                )}
                {event.imageUrl && (
                  <div className="mt-3 flex items-center gap-3">
                    <img
                      src={event.imageUrl}
                      alt={`${event.title}-thumb`}
                      className="w-36 h-24 object-cover rounded cursor-pointer border"
                      onClick={() => window.open(event.imageUrl, '_blank')}
                    />
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => window.open(event.imageUrl, '_blank')}
                        className="px-3 py-1 bg-gray-100 rounded text-sm hover:bg-gray-200"
                      >
                        Open
                      </button>
                      <button
                        type="button"
                        onClick={() => downloadImage(event.imageUrl || '', `${event.title || 'event-image'}.png`)}
                        className="px-3 py-1 bg-gray-100 rounded text-sm hover:bg-gray-200"
                      >
                        Download
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <div>
              <DialogTitle>Add Event</DialogTitle>
              <DialogDescription>Create a calendar entry and optional daily note.</DialogDescription>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <X className="w-5 h-5" />
            </button>
          </DialogHeader>

          <form onSubmit={onSubmitAdd} className="space-y-4 p-6">
            <div>
              <label className="block text-sm mb-1">Title</label>
              <Input
                required
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                placeholder="Event title"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1">Date</label>
                <Input
                  type="date"
                  required
                  value={form.date.slice(0, 10)}
                  onChange={e => {
                    const d = e.target.value
                    setForm({ ...form, date: new Date(d + 'T00:00:00').toISOString() })
                  }}
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Type</label>
                <Select
                  value={form.type}
                  onChange={e =>
                    setForm({ ...form, type: e.target.value as CalendarEvent['type'] })
                  }
                >
                  <option value="PERSONAL">Personal</option>
                  <option value="WORK">Work</option>
                  <option value="REMINDER">Reminder</option>
                  <option value="JOURNAL">Journal</option>
                  <option value="EVENT">Event</option>
                </Select>
              </div>
            </div>

            <div>
              <label className="block text-sm mb-1">Description</label>
              <Textarea
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="Details"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm mb-1">Daily update note</label>
              <Textarea
                value={dailyNote}
                onChange={e => setDailyNote(e.target.value)}
                placeholder="What happened today?"
                rows={3}
              />
              <p className="text-xs text-gray-500 mt-1">
                If you skip today, a default “Today – sad day 😢” note will be added.
              </p>
            </div>

            <div>
              <label className="block text-sm mb-1">Event Color</label>
              <div className="flex items-center gap-3">
                <Input
                  type="color"
                  value={form.color}
                  onChange={e => setForm({ ...form, color: e.target.value })}
                  className="w-16 h-10 p-0 rounded"
                />
                <Input
                  placeholder="Hex color"
                  value={form.color}
                  onChange={e => setForm({ ...form, color: e.target.value })}
                  className="flex-1"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm mb-1">Upload Image (optional)</label>
              <input
                type="file"
                accept="image/*"
                onChange={e => {
                  const f = e.target.files?.[0] ?? null
                  setImageFile(f)
                  if (f) {
                    const url = URL.createObjectURL(f)
                    setImagePreview(url)
                  } else {
                    setImagePreview(null)
                  }
                }}
                className="w-full"
              />

              {imagePreview && (
                <div className="mt-3">
                  <p className="text-xs text-gray-500 mb-2">Preview (click to open):</p>
                  <div className="flex items-center gap-3">
                    <img
                      src={imagePreview}
                      alt="preview"
                      className="w-32 h-20 object-cover rounded cursor-pointer border"
                      onClick={() => window.open(imagePreview, '_blank')}
                    />
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => window.open(imagePreview, '_blank')}
                        className="px-3 py-1 bg-gray-100 rounded text-sm hover:bg-gray-200"
                      >
                        Open
                      </button>
                      <button
                        type="button"
                        onClick={() => downloadImage(imagePreview, `${form.title || 'event-image'}.png`)}
                        className="px-3 py-1 bg-gray-100 rounded text-sm hover:bg-gray-200"
                      >
                        Download
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" onClick={() => setOpen(false)} className="bg-gray-200">
                Cancel
              </Button>
              <Button type="submit" className="bg-pink-500 text-white hover:bg-pink-600">
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
