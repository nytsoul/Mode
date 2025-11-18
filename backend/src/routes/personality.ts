import express, { Request, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import PersonalityQuiz from '../models/PersonalityQuiz';
import User from '../models/User';
import crypto from 'crypto';

const router = express.Router();

// Personality quiz questions
const PERSONALITY_QUESTIONS = [
  {
    id: 1,
    question: 'How do you express your feelings?',
    options: [
      { text: 'Verbally & Often', emoji: '💬', score: 1 },
      { text: 'Through Actions', emoji: '💪', score: 2 },
      { text: 'Romantically', emoji: '❤️', score: 3 },
      { text: 'Thoughtfully', emoji: '🤔', score: 4 },
    ],
  },
  {
    id: 2,
    question: 'Your ideal time together is:',
    options: [
      { text: 'Adventure', emoji: '🎢', score: 1 },
      { text: 'Quiet moments', emoji: '🌙', score: 2 },
      { text: 'Deep talks', emoji: '💭', score: 3 },
      { text: 'Fun & laughter', emoji: '😄', score: 4 },
    ],
  },
  {
    id: 3,
    question: 'When challenges arise, you:',
    options: [
      { text: 'Face them head-on', emoji: '⚔️', score: 1 },
      { text: 'Listen & support', emoji: '👂', score: 2 },
      { text: 'Find solutions together', emoji: '🤝', score: 3 },
      { text: 'Give space & understanding', emoji: '🕊️', score: 4 },
    ],
  },
  {
    id: 4,
    question: 'Your love language is:',
    options: [
      { text: 'Words of affirmation', emoji: '🗣️', score: 1 },
      { text: 'Acts of service', emoji: '🙏', score: 2 },
      { text: 'Physical touch', emoji: '🤗', score: 3 },
      { text: 'Quality time', emoji: '⏰', score: 4 },
    ],
  },
  {
    id: 5,
    question: 'Your personality vibe is:',
    options: [
      { text: 'Spontaneous & wild', emoji: '🌪️', score: 1 },
      { text: 'Calm & serene', emoji: '☮️', score: 2 },
      { text: 'Passionate & intense', emoji: '🔥', score: 3 },
      { text: 'Fun & playful', emoji: '🎮', score: 4 },
    ],
  },
  {
    id: 6,
    question: 'When someone is sad, you:',
    options: [
      { text: 'Cheer them up', emoji: '🎉', score: 1 },
      { text: 'Listen without judgment', emoji: '🎧', score: 2 },
      { text: 'Hold them close', emoji: '🫂', score: 3 },
      { text: 'Help them find solutions', emoji: '🔍', score: 4 },
    ],
  },
  {
    id: 7,
    question: 'Commitment means to you:',
    options: [
      { text: 'Adventure together', emoji: '🗺️', score: 1 },
      { text: 'Safety & stability', emoji: '🏠', score: 2 },
      { text: 'Deep emotional bond', emoji: '💞', score: 3 },
      { text: 'Growing together', emoji: '🌱', score: 4 },
    ],
  },
  {
    id: 8,
    question: 'Your ideal date would be:',
    options: [
      { text: 'Exploring new places', emoji: '✈️', score: 1 },
      { text: 'Cozy night in', emoji: '🛋️', score: 2 },
      { text: 'Romantic dinner', emoji: '🍽️', score: 3 },
      { text: 'Shared activity/hobby', emoji: '🎨', score: 4 },
    ],
  },
  {
    id: 9,
    question: 'In friendship, you value:',
    options: [
      { text: 'Fun & laughter', emoji: '😆', score: 1 },
      { text: 'Loyalty & trust', emoji: '🤞', score: 2 },
      { text: 'Deep understanding', emoji: '💎', score: 3 },
      { text: 'Always being there', emoji: '🌟', score: 4 },
    ],
  },
  {
    id: 10,
    question: 'Your biggest strength is:',
    options: [
      { text: 'Confidence', emoji: '💪', score: 1 },
      { text: 'Compassion', emoji: '💝', score: 2 },
      { text: 'Intelligence', emoji: '🧠', score: 3 },
      { text: 'Humor', emoji: '😂', score: 4 },
    ],
  },
];

// Personality types based on score ranges
const PERSONALITY_TYPES = [
  { min: 10, max: 15, type: 'The Free Spirit', icon: '🦅' },
  { min: 16, max: 21, type: 'The Nurturer', icon: '🌸' },
  { min: 22, max: 27, type: 'The Romantic', icon: '💕' },
  { min: 28, max: 40, type: 'The Sage', icon: '🌙' },
];

// Get all personality questions
router.get('/questions', (req: Request, res: Response) => {
  try {
    res.json({ questions: PERSONALITY_QUESTIONS });
  } catch (error: any) {
    console.error('Error fetching questions:', error);
    res.status(500).json({ message: error.message });
  }
});

// Start a new personality quiz
router.post('/start', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { mode } = req.body;
    if (!mode || !['love', 'friends'].includes(mode)) {
      return res.status(400).json({ message: 'Mode must be love or friends' });
    }

    const shareCode = crypto.randomBytes(8).toString('hex').toUpperCase();

    const quiz = new PersonalityQuiz({
      userId: req.userId,
      mode,
      shareCode,
      answers: [],
      totalScore: 0,
      completed: false,
    });

    await quiz.save();

    res.json({
      message: 'Quiz started',
      quizId: quiz._id,
      shareCode,
      questions: PERSONALITY_QUESTIONS,
    });
  } catch (error: any) {
    console.error('Start quiz error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Submit quiz answers
router.post('/submit', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { quizId, answers } = req.body;
    if (!quizId || !answers || !Array.isArray(answers)) {
      return res.status(400).json({ message: 'quizId and answers array are required' });
    }

    const quiz = await PersonalityQuiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    if (quiz.userId.toString() !== req.userId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    // Calculate score
    let totalScore = 0;
    const processedAnswers: any[] = [];

    for (const answer of answers) {
      const question = PERSONALITY_QUESTIONS.find((q) => q.id === answer.questionId);
      if (!question) continue;

      const option = question.options.find((o) => o.text === answer.selectedOption);
      if (option) {
        totalScore += option.score;
        processedAnswers.push({
          questionId: answer.questionId,
          selectedOption: answer.selectedOption,
          iconEmoji: option.emoji,
          score: option.score,
        });
      }
    }

    // Determine personality type
    const personalityType = PERSONALITY_TYPES.find(
      (pt) => totalScore >= pt.min && totalScore <= pt.max
    )?.type || 'The Mysterious One';

    quiz.answers = processedAnswers;
    quiz.totalScore = totalScore;
    quiz.personalityType = personalityType;
    quiz.completed = true;
    quiz.completedAt = new Date();

    await quiz.save();

    res.json({
      message: 'Quiz completed',
      quiz: {
        id: quiz._id,
        personalityType,
        totalScore,
        shareCode: quiz.shareCode,
      },
    });
  } catch (error: any) {
    console.error('Submit quiz error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get quiz by share code (for friend/lover to take same quiz)
router.get('/share/:shareCode', async (req: Request, res: Response) => {
  try {
    const { shareCode } = req.params;

    const quiz = await PersonalityQuiz.findOne({ shareCode }).populate('userId', 'name profilePhotos');
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    res.json({
      message: 'Shared quiz found',
      quiz: {
        id: quiz._id,
        sharedBy: quiz.userId,
        mode: quiz.mode,
        personalityType: quiz.personalityType,
        totalScore: quiz.totalScore,
        questions: PERSONALITY_QUESTIONS,
      },
    });
  } catch (error: any) {
    console.error('Get shared quiz error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Submit quiz as friend/lover (takes same quiz and calculates compatibility)
router.post('/submit-shared', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { originalQuizId, answers } = req.body;
    if (!originalQuizId || !answers) {
      return res.status(400).json({ message: 'originalQuizId and answers are required' });
    }

    const originalQuiz = await PersonalityQuiz.findById(originalQuizId);
    if (!originalQuiz) {
      return res.status(404).json({ message: 'Original quiz not found' });
    }

    // Create new quiz for responder
    const newQuiz = new PersonalityQuiz({
      userId: req.userId,
      mode: originalQuiz.mode,
      shareCode: crypto.randomBytes(8).toString('hex').toUpperCase(),
      answers: [],
      totalScore: 0,
      completed: true,
    });

    let totalScore = 0;
    const processedAnswers: any[] = [];

    for (const answer of answers) {
      const question = PERSONALITY_QUESTIONS.find((q) => q.id === answer.questionId);
      if (!question) continue;

      const option = question.options.find((o) => o.text === answer.selectedOption);
      if (option) {
        totalScore += option.score;
        processedAnswers.push({
          questionId: answer.questionId,
          selectedOption: answer.selectedOption,
          iconEmoji: option.emoji,
          score: option.score,
        });
      }
    }

    const personalityType = PERSONALITY_TYPES.find(
      (pt) => totalScore >= pt.min && totalScore <= pt.max
    )?.type || 'The Mysterious One';

    newQuiz.answers = processedAnswers;
    newQuiz.totalScore = totalScore;
    newQuiz.personalityType = personalityType;
    newQuiz.completedAt = new Date();

    await newQuiz.save();

    // Calculate compatibility score (0-100)
    const scoreDifference = Math.abs(originalQuiz.totalScore - totalScore);
    const compatibility = Math.max(0, 100 - scoreDifference * 2);

    // Add to original quiz's sharedWith
    originalQuiz.sharedWith = originalQuiz.sharedWith || [];
    if (!originalQuiz.sharedWith.includes(req.userId as any)) {
      originalQuiz.sharedWith.push(req.userId as any);
      await originalQuiz.save();
    }

    res.json({
      message: 'Quiz submitted and compatibility calculated',
      myPersonality: {
        type: personalityType,
        score: totalScore,
      },
      compatibility: {
        score: compatibility,
        message:
          compatibility > 80
            ? 'Perfect match! 💕'
            : compatibility > 60
            ? 'Great compatibility! 💙'
            : compatibility > 40
            ? 'Good potential! 💛'
            : 'Learn more about each other 🤍',
      },
      originalUserPersonality: {
        type: originalQuiz.personalityType,
        score: originalQuiz.totalScore,
      },
    });
  } catch (error: any) {
    console.error('Submit shared quiz error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get user's quiz history
router.get('/my-quizzes', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const quizzes = await PersonalityQuiz.find({ userId: req.userId })
      .populate('sharedWith', 'name profilePhotos')
      .sort({ createdAt: -1 });

    res.json({
      quizzes: quizzes.map((q) => ({
        id: q._id,
        mode: q.mode,
        personalityType: q.personalityType,
        totalScore: q.totalScore,
        shareCode: q.shareCode,
        sharedWith: q.sharedWith,
        completed: q.completed,
        completedAt: q.completedAt,
      })),
    });
  } catch (error: any) {
    console.error('Get user quizzes error:', error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
