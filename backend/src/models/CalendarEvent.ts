import mongoose, { Schema, Document } from 'mongoose';

export interface IDailyEntry {
  date: Date;
  memory?: string;
  notes?: string;
  mood?: 'happy' | 'sad' | 'excited' | 'peaceful' | 'romantic';
  photos?: string[];
  _id?: mongoose.Types.ObjectId;
}

export interface ICalendarEvent extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  type: 'birthday' | 'anniversary' | 'date' | 'event' | 'reminder' | 'memory';
  date: Date;
  recurring?: {
    frequency: 'yearly' | 'monthly' | 'weekly' | 'daily';
    endDate?: Date;
  };
  description?: string;
  dailyEntries?: IDailyEntry[];
  participants: mongoose.Types.ObjectId[]; // Other users involved
  reminder?: {
    enabled: boolean;
    minutesBefore: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const DailyEntrySchema = new Schema<IDailyEntry>({
  date: { type: Date, required: true },
  memory: String,
  notes: String,
  mood: { type: String, enum: ['happy', 'sad', 'excited', 'peaceful', 'romantic'] },
  photos: [String],
}, { timestamps: true });

const CalendarEventSchema = new Schema<ICalendarEvent>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, maxlength: 200 },
    type: {
      type: String,
      enum: ['birthday', 'anniversary', 'date', 'event', 'reminder', 'memory'],
      required: true,
    },
    date: { type: Date, required: true },
    recurring: {
      frequency: { type: String, enum: ['yearly', 'monthly', 'weekly', 'daily'] },
      endDate: { type: Date },
    },
    description: { type: String, maxlength: 1000 },
    dailyEntries: [DailyEntrySchema],
    participants: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    reminder: {
      enabled: { type: Boolean, default: false },
      minutesBefore: { type: Number, default: 60 },
    },
  },
  {
    timestamps: true,
  }
);

CalendarEventSchema.index({ userId: 1, date: 1 });
CalendarEventSchema.index({ userId: 1, type: 1 });

export default mongoose.model<ICalendarEvent>('CalendarEvent', CalendarEventSchema);

