# 🔌 Personality Quiz & Calendar API Documentation

## Base URL
```
http://localhost:5000/api
```

## Authentication
All endpoints (except public share endpoints) require:
```
Authorization: Bearer {token}
```

---

## 📝 Personality Quiz Endpoints

### 1. Get All Quiz Questions
```
GET /personality/questions

Response:
{
  "questions": [
    {
      "id": 1,
      "question": "How do you express your feelings?",
      "options": [
        { "text": "Verbally & Often", "emoji": "💬", "score": 1 },
        { "text": "Through Actions", "emoji": "💪", "score": 2 },
        ...
      ]
    },
    ...
  ]
}
```

### 2. Start New Quiz
```
POST /personality/start
Content-Type: application/json

Body:
{
  "mode": "love"  // or "friends"
}

Response:
{
  "message": "Quiz started",
  "quizId": "507f1f77bcf86cd799439011",
  "shareCode": "AB12CD34",
  "questions": [...]
}
```

### 3. Submit Quiz Answers
```
POST /personality/submit
Content-Type: application/json

Body:
{
  "quizId": "507f1f77bcf86cd799439011",
  "answers": [
    {
      "questionId": 1,
      "selectedOption": "Verbally & Often",
      "emoji": "💬",
      "score": 1
    },
    ...
  ]
}

Response:
{
  "message": "Quiz completed",
  "quiz": {
    "id": "507f1f77bcf86cd799439011",
    "personalityType": "The Romantic",
    "totalScore": 25,
    "shareCode": "AB12CD34"
  }
}
```

### 4. Get Shared Quiz (Public)
```
GET /personality/share/AB12CD34

Response:
{
  "message": "Shared quiz found",
  "quiz": {
    "id": "507f1f77bcf86cd799439011",
    "sharedBy": {
      "_id": "...",
      "name": "Alice",
      "profilePhotos": [...]
    },
    "mode": "love",
    "personalityType": "The Romantic",
    "totalScore": 25,
    "questions": [...]
  }
}
```

### 5. Submit Shared Quiz (Calculate Compatibility)
```
POST /personality/submit-shared
Content-Type: application/json

Body:
{
  "originalQuizId": "507f1f77bcf86cd799439011",
  "answers": [
    {
      "questionId": 1,
      "selectedOption": "Through Actions",
      "emoji": "💪",
      "score": 2
    },
    ...
  ]
}

Response:
{
  "message": "Quiz submitted and compatibility calculated",
  "myPersonality": {
    "type": "The Nurturer",
    "score": 19
  },
  "compatibility": {
    "score": 75,
    "message": "Great compatibility! 💙"
  },
  "originalUserPersonality": {
    "type": "The Romantic",
    "score": 25
  }
}
```

### 6. Get User's Quiz History
```
GET /personality/my-quizzes

Response:
{
  "quizzes": [
    {
      "id": "507f1f77bcf86cd799439011",
      "mode": "love",
      "personalityType": "The Romantic",
      "totalScore": 25,
      "shareCode": "AB12CD34",
      "sharedWith": [
        {
          "_id": "...",
          "name": "Bob",
          "profilePhotos": [...]
        }
      ],
      "completed": true,
      "completedAt": "2025-11-16T10:30:00Z"
    }
  ]
}
```

---

## 📅 Calendar Endpoints

### 1. Create Calendar Event
```
POST /calendar
Content-Type: application/json

Body:
{
  "title": "Our First Date Anniversary",
  "type": "anniversary",  // birthday, anniversary, date, event, reminder, memory
  "date": "2025-12-25T00:00:00Z",
  "description": "Celebrating our first year together",
  "reminder": {
    "enabled": true,
    "minutesBefore": 1440
  }
}

Response:
{
  "message": "Calendar event created",
  "event": {
    "_id": "507f1f77bcf86cd799439011",
    "title": "Our First Date Anniversary",
    "type": "anniversary",
    "date": "2025-12-25T00:00:00Z",
    "dailyEntries": [],
    ...
  }
}
```

### 2. Get Calendar Events (With Date Range)
```
GET /calendar?startDate=2025-11-01T00:00:00Z&endDate=2025-11-30T23:59:59Z&type=anniversary

Response:
{
  "events": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "title": "Our First Date Anniversary",
      "type": "anniversary",
      "date": "2025-12-25T00:00:00Z",
      "dailyEntries": [],
      ...
    }
  ]
}
```

### 3. Add Daily Entry to Event
```
POST /calendar/507f1f77bcf86cd799439011/entry
Content-Type: application/json

Body:
{
  "date": "2025-11-16T00:00:00Z",
  "memory": "Had amazing dinner at the Italian place",
  "notes": "She wore that beautiful red dress. We laughed so much!",
  "mood": "romantic",  // happy, sad, excited, peaceful, romantic
  "photos": ["photo1.jpg", "photo2.jpg"]
}

Response:
{
  "message": "Daily entry saved",
  "entry": {
    "date": "2025-11-16T00:00:00Z",
    "memory": "Had amazing dinner at the Italian place",
    "notes": "She wore that beautiful red dress. We laughed so much!",
    "mood": "romantic",
    "photos": ["photo1.jpg", "photo2.jpg"]
  }
}
```

### 4. Get Daily Entries for Event
```
GET /calendar/507f1f77bcf86cd799439011/entries

Response:
{
  "entries": [
    {
      "date": "2025-11-16T00:00:00Z",
      "memory": "Had amazing dinner at the Italian place",
      "notes": "She wore that beautiful red dress. We laughed so much!",
      "mood": "romantic",
      "photos": ["photo1.jpg", "photo2.jpg"]
    },
    {
      "date": "2025-11-15T00:00:00Z",
      "memory": "Movie night at home",
      "notes": "Watched our favorite movie again",
      "mood": "peaceful",
      "photos": []
    }
  ]
}
```

### 5. Delete Daily Entry
```
DELETE /calendar/507f1f77bcf86cd799439011/entry/2025-11-16

Response:
{
  "message": "Daily entry deleted"
}
```

### 6. Update Event
```
PUT /calendar/507f1f77bcf86cd799439011
Content-Type: application/json

Body:
{
  "title": "Our Anniversary (Updated)",
  "description": "New description",
  "reminder": {
    "enabled": false,
    "minutesBefore": 0
  }
}

Response:
{
  "message": "Event updated",
  "event": { ... }
}
```

### 7. Delete Event
```
DELETE /calendar/507f1f77bcf86cd799439011

Response:
{
  "message": "Event deleted"
}
```

---

## 🎯 Error Responses

### 400 Bad Request
```json
{
  "message": "Title, type, and date are required"
}
```

### 401 Unauthorized
```json
{
  "message": "Invalid or expired token"
}
```

### 403 Forbidden
```json
{
  "message": "Unauthorized"
}
```

### 404 Not Found
```json
{
  "message": "Quiz not found"
}
```

### 500 Internal Server Error
```json
{
  "message": "Internal server error"
}
```

---

## 🧪 Example Frontend Usage

### React Hook to Take Quiz
```typescript
const takeQuiz = async () => {
  // 1. Get questions
  const questionsRes = await api.get('/personality/questions');
  
  // 2. Start quiz
  const startRes = await api.post('/personality/start', { mode: 'love' });
  const quizId = startRes.data.quizId;
  
  // 3. Submit answers
  const answers = [
    { questionId: 1, selectedOption: 'Verbally & Often', emoji: '💬', score: 1 },
    // ...
  ];
  
  const submitRes = await api.post('/personality/submit', { quizId, answers });
  console.log('Share code:', submitRes.data.quiz.shareCode);
};

// React Hook to Take Shared Quiz
const takeSharedQuiz = async (shareCode) => {
  // 1. Get shared quiz
  const quizRes = await api.get(`/personality/share/${shareCode}`);
  const originalQuizId = quizRes.data.quiz.id;
  
  // 2. Submit responses
  const answers = [{ questionId: 1, selectedOption: 'Through Actions', emoji: '💪', score: 2 }, ...];
  
  const resultRes = await api.post('/personality/submit-shared', { originalQuizId, answers });
  console.log('Compatibility:', resultRes.data.compatibility.score);
};

// React Hook to Add Calendar Entry
const addMemory = async (eventId) => {
  await api.post(`/calendar/${eventId}/entry`, {
    date: new Date(),
    memory: 'Amazing day together',
    notes: 'Perfect weather, great conversation',
    mood: 'romantic',
    photos: []
  });
};
```

---

## 📊 Data Validation

### Quiz Validation
- `mode`: Must be 'love' or 'friends'
- `answers`: Array with questionId (1-10), selectedOption (string), emoji (string), score (number)
- Score per question: 1-4

### Calendar Validation
- `title`: Required, max 200 characters
- `type`: Must be one of: birthday, anniversary, date, event, reminder, memory
- `date`: ISO 8601 format
- `mood`: Must be one of: happy, sad, excited, peaceful, romantic
- `photos`: Array of photo URLs

---

**API Version:** 1.0
**Last Updated:** November 16, 2025
