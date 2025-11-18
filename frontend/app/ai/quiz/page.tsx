'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { Loader2, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function QuizPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [quiz, setQuiz] = useState<any>(null)
  const [answers, setAnswers] = useState<Record<number, any>>({})
  const [currentIndex, setCurrentIndex] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  const generateQuiz = async () => {
    setLoading(true)
    try {
      const selectedMode = searchParams?.get('mode') || user?.modeDefault || 'love'
      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/ai/quiz`, {
        mode: selectedMode,
        count: 15,
      })
      setQuiz(response.data.quiz)
      setAnswers({})
      setCurrentIndex(0)
      setSubmitted(false)
      setScore(null)
      toast.success('Quiz generated!')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to generate quiz')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      // Calculate score based on answers
      const totalQuestions = quiz.questions?.length || 1
      const answeredCount = Object.values(answers).filter((answer) => {
        if (answer === undefined || answer === null) return false
        if (typeof answer === 'string') return answer.trim().length > 0
        return true
      }).length
      const calculatedScore = Math.round((answeredCount / totalQuestions) * 100)
      
      setScore(calculatedScore)
      setSubmitted(true)
      toast.success(`Quiz submitted! Your score: ${calculatedScore}%`)
      
      // Save score to backend (optional)
      try {
        const selectedMode = searchParams?.get('mode') || user?.modeDefault || 'love'
        await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/ai/quiz/score`, {
          score: calculatedScore,
          mode: selectedMode,
        })
      } catch (err) {
        // Score endpoint may not exist, ignore
      }

      // Redirect to dashboard after 3 seconds
      setTimeout(() => {
        router.push('/dashboard')
      }, 3000)
    } finally {
      setSubmitting(false)
    }
  }

  if (authLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  if (!user) {
    return null
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-gray-900 rounded-lg shadow-lg p-8 border border-gray-700">
        <h1 className="text-2xl font-bold text-white mb-4">
          {(searchParams?.get('mode') || user.modeDefault) === 'love' ? 'Love' : 'Friendship'} Compatibility Quiz
        </h1>

        {submitted && score !== null ? (
          <div className="text-center py-8 space-y-4">
            <div className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-400 to-purple-400">
              {score}%
            </div>
            <h2 className="text-xl font-semibold text-white">Great Job!</h2>
            <p className="text-gray-300">
              {score >= 80 && 'Excellent compatibility score!'}
              {score >= 60 && score < 80 && 'Good compatibility score!'}
              {score >= 40 && score < 60 && 'Average compatibility score.'}
              {score < 40 && 'Room for improvement!'}
            </p>
            <p className="text-sm text-gray-400">Redirecting to dashboard in 3 seconds...</p>
          </div>
        ) : !quiz ? (
          <div className="text-center py-12">
            <button
              onClick={generateQuiz}
              disabled={loading}
              className="px-8 py-4 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-lg hover:from-pink-700 hover:to-purple-700 disabled:opacity-50 flex items-center gap-2 mx-auto font-semibold"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating Quiz...
                </>
              ) : (
                'Start Quiz'
              )}
            </button>
          </div>
        ) : (
          <div>
            <div className="mb-4">
              <div className="text-sm text-gray-300">Question {currentIndex + 1} of {quiz.questions.length}</div>
              <div className="w-full h-2 bg-gray-800 rounded mt-2">
                <div className="h-2 bg-pink-500 rounded" style={{ width: `${((currentIndex+1)/quiz.questions.length)*100}%` }} />
              </div>
            </div>

            {/* Single question view */}
            {quiz.questions && quiz.questions[currentIndex] && (
              <div className="p-4 border border-gray-700 rounded-lg bg-gray-800 text-white">
                <h3 className="font-semibold mb-3">
                  {currentIndex + 1}. {quiz.questions[currentIndex].question}
                </h3>

                {quiz.questions[currentIndex].type === 'multiple-choice' && quiz.questions[currentIndex].options && (
                  <div className="space-y-2">
                    {quiz.questions[currentIndex].options.map((option: string, optIdx: number) => (
                      <label key={optIdx} className="flex items-center p-2 hover:bg-gray-700 rounded cursor-pointer">
                        <input
                          type="radio"
                          name={`question-${currentIndex}`}
                          value={option}
                          checked={answers[currentIndex] === option}
                          onChange={(e) => setAnswers({ ...answers, [currentIndex]: e.target.value })}
                          className="mr-2"
                        />
                        <span className="text-gray-200">{option}</span>
                      </label>
                    ))}
                  </div>
                )}

                {quiz.questions[currentIndex].type === 'scale' && (
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((num) => (
                      <button
                        key={num}
                        onClick={() => setAnswers({ ...answers, [currentIndex]: num })}
                        className={`px-4 py-2 rounded ${answers[currentIndex] === num ? 'bg-pink-500 text-white' : 'bg-gray-700 text-gray-200'}`}>
                        {num}
                      </button>
                    ))}
                  </div>
                )}

                {quiz.questions[currentIndex].type === 'text' && (
                  <div>
                    <input
                      type="text"
                      placeholder="Type your answer..."
                      value={answers[currentIndex] || ''}
                      onChange={(e) => setAnswers({ ...answers, [currentIndex]: e.target.value })}
                      className="w-full px-3 py-2 rounded bg-gray-900 border border-gray-700 text-white"
                    />
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                disabled={currentIndex === 0}
                className="px-4 py-2 rounded bg-gray-700 text-white disabled:opacity-50"
              >
                Back
              </button>

              {currentIndex < quiz.questions.length - 1 ? (
                <button
                  onClick={() => setCurrentIndex((i) => Math.min(quiz.questions.length - 1, i + 1))}
                  className="px-4 py-2 rounded bg-pink-600 text-white hover:bg-pink-700 ml-auto"
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="ml-auto px-6 py-2 rounded bg-gradient-to-r from-pink-600 to-purple-600 text-white disabled:opacity-50"
                >
                  {submitting ? (
                    <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin"/> Submitting...</span>
                  ) : (
                    'Finish Quiz'
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

