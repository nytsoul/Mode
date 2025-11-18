import mongoose, { Schema, Document } from 'mongoose';

export interface IPersonalityAnswer {
  questionId: number;
  selectedOption: string;
  iconEmoji: string;
  score: number;
}

export interface IPersonalityQuiz extends Document {
  userId: mongoose.Types.ObjectId;
  mode: 'love' | 'friends';
  shareCode: string; // unique code for sharing
  sharedWith?: mongoose.Types.ObjectId[]; // users who took this quiz
  answers: IPersonalityAnswer[];
  totalScore: number;
  personalityType: string; // e.g., "Romantic Soul", "True Friend"
  completed: boolean;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PersonalityAnswerSchema = new Schema<IPersonalityAnswer>({
  questionId: { type: Number, required: true },
  selectedOption: { type: String, required: true },
  iconEmoji: { type: String, required: true },
  score: { type: Number, required: true },
}, { _id: false });

const PersonalityQuizSchema = new Schema<IPersonalityQuiz>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    mode: { type: String, enum: ['love', 'friends'], required: true },
    shareCode: { type: String, unique: true, required: true, index: true },
    sharedWith: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    answers: [PersonalityAnswerSchema],
    totalScore: { type: Number, default: 0 },
    personalityType: { type: String, default: '' },
    completed: { type: Boolean, default: false },
    completedAt: Date,
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IPersonalityQuiz>('PersonalityQuiz', PersonalityQuizSchema);
