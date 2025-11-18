import express, { Response } from 'express'
import { body, validationResult } from 'express-validator'
import CalendarEvent from '../models/CalendarEvent'
import User from '../models/User'
import { authenticate, AuthRequest } from '../middleware/auth'
import OpenAI from 'openai'

const router = express.Router()

// Initialize OpenAI (optional)
const getOpenAIClient = (): OpenAI | null => {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey || apiKey.trim() === '') return null
  try {
    return new OpenAI({ apiKey })
  } catch {
    return null
  }
}
const openai = getOpenAIClient()

// Utility: safe YYYY-MM-DD key
const ymd = (d: Date | string) => new Date(d).toISOString().slice(0, 10)

// Get calendar events
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate, type } = req.query

    const query: any = { userId: req.userId }
    if (startDate || endDate) {
      query.date = {}
      if (startDate) query.date.$gte = new Date(startDate as string)
      if (endDate) query.date.$lte = new Date(endDate as string)
    }
    if (type) query.type = type

    const events = await CalendarEvent.find(query)
      .populate('participants', 'name profilePhotos')
      .sort({ date: 1 })

    res.json({ events })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// Get upcoming events
router.get('/upcoming', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { limit = 10 } = req.query
    const now = new Date()
    const lim = Math.max(1, parseInt(limit as string, 10) || 10)

    const events = await CalendarEvent.find({
      userId: req.userId,
      date: { $gte: now },
    })
      .populate('participants', 'name profilePhotos')
      .sort({ date: 1 })
      .limit(lim)

    res.json({ events })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// AI-powered event suggestions
router.post('/suggestions', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { mode = 'love', date, preferences, budget } = req.body
    await User.findById(req.userId) // optional usage

    if (!openai) {
      const fallbackSuggestions =
        mode === 'love'
          ? [
              { title: 'Romantic Dinner', type: 'date', description: 'A cozy dinner at a nice restaurant' },
              { title: 'Sunset Picnic', type: 'date', description: 'Picnic in the park during sunset' },
              { title: 'Museum Visit', type: 'date', description: 'Explore art and culture together' },
              { title: 'Cooking Class', type: 'date', description: 'Learn to cook a new cuisine together' },
              { title: 'Stargazing Night', type: 'date', description: 'Watch the stars together' },
            ]
          : [
              { title: 'Game Night', type: 'event', description: 'Board games and fun with friends' },
              { title: 'Hiking Adventure', type: 'event', description: 'Explore nature together' },
              { title: 'Concert', type: 'event', description: 'Enjoy live music' },
              { title: 'Food Tour', type: 'event', description: 'Try different restaurants' },
              { title: 'Movie Marathon', type: 'event', description: 'Watch favorite movies together' },
            ]
      return res.json({ suggestions: fallbackSuggestions })
    }

    const prompt = `Suggest 5 ${mode === 'love' ? 'romantic date' : 'friendship activity'} ideas${
      date ? ` for ${date}` : ''
    }${preferences ? ` based on: ${preferences}` : ''}${budget ? ` with a budget of ${budget}` : ''}. Return as JSON array with title, type, description, and suggestedDate fields.`

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are an event planning assistant. Return only valid JSON arrays with event suggestions.',
        },
        { role: 'user', content: prompt },
      ],
      max_tokens: 500,
      temperature: 0.8,
    })

    let suggestions
    try {
      const content = completion.choices[0]?.message?.content || '[]'
      suggestions = JSON.parse(content.replace(/``````/g, ''))
    } catch (parseError) {
      suggestions = [{ title: 'Special Event', type: 'event', description: 'A memorable experience together' }]
    }

    res.json({ suggestions })
  } catch (error: any) {
    console.error('Event suggestions error:', error)
    res.status(500).json({ message: error.message || 'Failed to generate suggestions' })
  }
})

// Create event
router.post(
  '/',
  authenticate,
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('date').isISO8601().withMessage('Valid date is required'),
    // Align with frontend mapping: we accept lower-case legacy and add JOURNAL support via 'event'
    body('type').isIn(['birthday', 'anniversary', 'date', 'event', 'reminder']).withMessage('Invalid event type'),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { title, type, date, description, recurring, participants, reminder } = req.body

      const event = new CalendarEvent({
        userId: req.userId,
        title,
        type, // client maps UI types to these values
        date: new Date(date),
        description,
        recurring,
        participants: participants || [],
        reminder: reminder || { enabled: false, minutesBefore: 60 },
      })

      await event.save()
      await event.populate('participants', 'name profilePhotos')

      res.status(201).json({ event })
    } catch (error: any) {
      res.status(500).json({ message: error.message })
    }
  }
)

// Create event from AI suggestion
router.post('/from-suggestion', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { title, type, date, description, reminder } = req.body

    if (!title || !date) {
      return res.status(400).json({ message: 'Title and date are required' })
    }

    const event = new CalendarEvent({
      userId: req.userId,
      title,
      type: type || 'event',
      date: new Date(date),
      description,
      reminder: reminder || { enabled: true, minutesBefore: 60 },
    })

    await event.save()
    await event.populate('participants', 'name profilePhotos')

    res.status(201).json({ event })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// Update event
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const event = await CalendarEvent.findOne({ _id: req.params.id, userId: req.userId })
    if (!event) {
      return res.status(404).json({ message: 'Event not found' })
    }

    const updates = { ...req.body }
    if (updates.date) updates.date = new Date(updates.date)

    Object.assign(event, updates)
    await event.save()
    await event.populate('participants', 'name profilePhotos')

    res.json({ event })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// Delete event
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const event = await CalendarEvent.findOneAndDelete({ _id: req.params.id, userId: req.userId })
    if (!event) {
      return res.status(404).json({ message: 'Event not found' })
    }

    res.json({ message: 'Event deleted' })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// Export calendar (ICS format) – with UID and DTSTAMP
router.get('/export', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const events = await CalendarEvent.find({ userId: req.userId })
    const nowStamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'

    let ics = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Loves Platform//EN\r\n'
    events.forEach((event) => {
      const uid = `${event._id}@loves-platform`
      const dtstart = event.date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
      ics += 'BEGIN:VEVENT\r\n'
      ics += `UID:${uid}\r\n`
      ics += `DTSTAMP:${nowStamp}\r\n`
      ics += `DTSTART:${dtstart}\r\n`
      if (event.title) ics += `SUMMARY:${event.title}\r\n`
      if (event.description) ics += `DESCRIPTION:${String(event.description).replace(/\r?\n/g, '\\n')}\r\n`
      ics += 'END:VEVENT\r\n'
    })
    ics += 'END:VCALENDAR\r\n'

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="loves-calendar.ics"')
    res.send(ics)
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// Get events statistics
router.get('/stats', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const total = await CalendarEvent.countDocuments({ userId: req.userId })
    const upcoming = await CalendarEvent.countDocuments({
      userId: req.userId,
      date: { $gte: new Date() },
    })
    const past = await CalendarEvent.countDocuments({
      userId: req.userId,
      date: { $lt: new Date() },
    })

    const byType = await CalendarEvent.aggregate([
      { $match: { userId: req.userId } },
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ])

    res.json({
      total,
      upcoming,
      past,
      byType: byType.reduce((acc, item) => {
        acc[item._id] = item.count
        return acc
      }, {} as Record<string, number>),
    })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// Add or update daily entry for an event
router.post('/:eventId/entry', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params
    const { date, memory, notes, mood, photos } = req.body

    if (!date) {
      return res.status(400).json({ message: 'Date is required' })
    }

    const event = await CalendarEvent.findById(eventId)
    if (!event) {
      return res.status(404).json({ message: 'Event not found' })
    }
    if (event.userId.toString() !== req.userId) {
      return res.status(403).json({ message: 'Unauthorized' })
    }

    if (!event.dailyEntries) {
      event.dailyEntries = []
    }

    const entryDate = new Date(date)
    const key = (d: Date | string) => new Date(d).toISOString().slice(0, 10)
    const existingIndex = event.dailyEntries.findIndex(
      (entry: any) => key(entry.date) === key(entryDate)
    )

    const entryData = {
      date: entryDate,
      memory: memory || '',
      notes: notes || '',
      mood: mood || undefined,
      photos: photos || [],
    }

    if (existingIndex >= 0) {
      event.dailyEntries[existingIndex] = entryData
    } else {
      event.dailyEntries.push(entryData)
    }

    await event.save()

    res.json({
      message: 'Daily entry saved',
      entry: entryData,
    })
  } catch (error: any) {
    console.error('Add entry error:', error)
    res.status(500).json({ message: error.message })
  }
})

// Get daily entries for event
router.get('/:eventId/entries', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params
    const event = await CalendarEvent.findById(eventId)

    if (!event) {
      return res.status(404).json({ message: 'Event not found' })
    }
    if (event.userId.toString() !== req.userId) {
      return res.status(403).json({ message: 'Unauthorized' })
    }

    const entries = event.dailyEntries || []
    entries.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())

    res.json({ entries })
  } catch (error: any) {
    console.error('Get entries error:', error)
    res.status(500).json({ message: error.message })
  }
})

// Delete daily entry by date (YYYY-MM-DD or ISO)
router.delete('/:eventId/entry/:entryDate', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId, entryDate } = req.params
    const event = await CalendarEvent.findById(eventId)

    if (!event) {
      return res.status(404).json({ message: 'Event not found' })
    }
    if (event.userId.toString() !== req.userId) {
      return res.status(403).json({ message: 'Unauthorized' })
    }

    if (event.dailyEntries) {
      const key = (d: Date | string) => new Date(d).toISOString().slice(0, 10)
      const targetKey = key(entryDate)
      event.dailyEntries = event.dailyEntries.filter((entry: any) => key(entry.date) !== targetKey)
      await event.save()
    }

    res.json({ message: 'Daily entry deleted' })
  } catch (error: any) {
    console.error('Delete entry error:', error)
    res.status(500).json({ message: error.message })
  }
})

export default router
