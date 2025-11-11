# Testing WhatsApp Training - Quick Guide

## Prerequisites
1. Ensure server is running (`npm run dev`)
2. Twilio webhook is configured and active
3. `Training_KB` collection has at least 1-2 sample sessions
4. Have a test WhatsApp number ready

## Quick Test Scenarios

### Scenario 1: First-Time Partner Enrollment
**Goal**: Verify auto-start functionality

1. Send from WhatsApp: `"I am a new partner"`
2. **Expected Response**:
   - Welcome message with personalized greeting
   - Information about total sessions
   - Automatic delivery of Session 1
3. **Verify in Database**:
   ```javascript
   db.Training_Progress.findOne({ phone: "+1234567890" })
   // Should show: inTrainingMode: true, currentSection: 1
   ```

### Scenario 2: Navigation Commands
**Goal**: Test menu-driven navigation

1. While in training, send: `"menu"`
2. **Expected**: Menu with all commands and progress stats
3. Send: `"next"`
4. **Expected**: Session 2 delivered
5. Send: `"previous"`
6. **Expected**: Back to Session 1
7. Send: `"section 3"`
8. **Expected**: Jump to Session 3

### Scenario 3: Interactive Q&A
**Goal**: Test contextual question handling

1. While viewing a session, ask: `"What are the main points?"`
2. **Expected**: 
   - AI answer based on current session content
   - Reminder with "Type 'next' to continue"
3. **Verify**: Question and answer stored in `Training_Progress.sectionChats`

### Scenario 4: Progress Tracking
**Goal**: Verify completion tracking

1. Send: `"complete"`
2. **Expected**: 
   - Confirmation message
   - Updated progress stats (e.g., "1/7 sessions completed")
3. **Verify in Database**:
   ```javascript
   db.Training_Progress.findOne({ phone: "+1234567890" })
   // completedSections should include current section number
   ```

### Scenario 5: Exit and Resume
**Goal**: Test persistence of progress

1. Send: `"exit"`
2. **Expected**: Exit confirmation with progress summary
3. **Verify**: `inTrainingMode: false` in database
4. Send: `"start training"`
5. **Expected**: Resume from last position (not from beginning)
6. **Verify**: `currentSection` unchanged from before exit

### Scenario 6: Full Completion
**Goal**: Test completion flow

1. Navigate through all sessions using `"next"`
2. At last session, send: `"next"`
3. **Expected**: 
   - Congratulations message
   - Option to review or exit
   - No error when trying to go beyond last session

## Test Data Setup

### Sample Training Sections
If your `Training_KB` collection is empty, insert sample data:

```javascript
db.Training_KB.insertMany([
  {
    s_no: 1,
    heading: "Introduction to Global Metal Direct",
    content: "Welcome to GMT! We are a leading supplier of industrial metal products. Our mission is to provide quality products and exceptional service. Key values: Quality, Reliability, Customer Focus.",
    createdAt: new Date()
  },
  {
    s_no: 2,
    heading: "Product Catalog Overview",
    content: "Our main product categories include: Steel Products (sheets, coils, bars), Aluminum (various alloys), Copper products, and Specialty metals. Each category has specific applications and specifications.",
    createdAt: new Date()
  },
  {
    s_no: 3,
    heading: "Partner Responsibilities",
    content: "As a GMT partner, you'll: Represent our brand professionally, maintain product knowledge, provide excellent customer service, submit reports monthly, attend quarterly meetings.",
    createdAt: new Date()
  }
])
```

## Database Queries for Verification

### Check Training Progress
```javascript
// View all partners in training
db.Training_Progress.find({ inTrainingMode: true })

// View specific partner's progress
db.Training_Progress.findOne({ phone: "+1234567890" })

// Count completed sessions
db.Training_Progress.aggregate([
  {
    $project: {
      phone: 1,
      completedCount: { $size: "$completedSections" }
    }
  }
])
```

### Check Training Sessions
```javascript
// List all sessions
db.Training_KB.find().sort({ s_no: 1 })

// Count total sessions
db.Training_KB.countDocuments()
```

### Check Chat History
```javascript
// View WhatsApp chat history for a partner
db.GMT_CH.findOne({ phoneNumber: "+1234567890" })
```

## Common Issues & Solutions

### Issue: "Training doesn't start"
**Checks**:
1. Is server running and webhook configured?
2. Does `Training_KB` have any documents?
3. Check server logs for errors
4. Verify phone number format (E.164: +1234567890)

**Solution**:
```bash
# Check server logs
npm run dev
# Look for: "✓ Training started for..."

# Verify DB connection
mongosh
use [your_db_name]
db.Training_KB.find()
```

### Issue: "Menu command not working"
**Checks**:
1. Is partner in training mode?
2. Check exact command text (case-insensitive, but must be exact)

**Solution**:
```javascript
// Manually enable training mode if needed
db.Training_Progress.updateOne(
  { phone: "+1234567890" },
  { $set: { inTrainingMode: true } }
)
```

### Issue: "Questions get generic responses"
**Checks**:
1. Is OpenAI API key configured?
2. Is section content loaded properly?

**Solution**:
Check `.env` file:
```
OPENAI_API_KEY=sk-...
```

### Issue: "Partner stuck in training mode"
**Solution**:
```javascript
db.Training_Progress.updateOne(
  { phone: "+1234567890" },
  { $set: { inTrainingMode: false } }
)
```

## Success Criteria

✅ **Enrollment**: Partner can trigger training with natural phrases
✅ **Auto-Start**: Session 1 delivered immediately after enrollment
✅ **Navigation**: All menu commands work (next, previous, menu, etc.)
✅ **Contextual Q&A**: Questions get relevant answers based on session
✅ **Progress Tracking**: Completion status accurately tracked
✅ **Persistence**: Progress saved and restored after exit
✅ **Completion**: Congratulations message at end of all sessions
✅ **Error Handling**: Graceful handling of invalid commands
✅ **Personalization**: Partner's name used in messages

## Load Testing

### Test with Multiple Partners
1. Create 3-5 test phone numbers
2. Enroll all simultaneously
3. Have each navigate independently
4. Verify no cross-contamination of progress

### Test Edge Cases
- Empty `Training_KB` collection
- Partner tries to access section beyond available
- Partner sends random text during training
- Partner tries "next" at last section
- Partner tries "previous" at first section

## Monitoring Commands

```bash
# Watch server logs in real-time
npm run dev | grep -i training

# Check recent training activity
mongosh
use [your_db_name]
db.Training_Progress.find({ lastUpdated: { $gte: new Date(Date.now() - 3600000) } })

# View last 10 messages from a partner
db.GMT_CH.findOne(
  { phoneNumber: "+1234567890" },
  { messages: { $slice: -10 } }
)
```

## Rollback Plan

If issues occur in production:

1. **Disable Training Triggers** (temp fix):
   ```typescript
   // In twilio.service.ts, comment out:
   // if (this.isTrainingEnrollmentMessage(message)) {
   //   await this.startTrainingFlow(e164);
   //   return;
   // }
   ```

2. **Exit All Partners from Training**:
   ```javascript
   db.Training_Progress.updateMany(
     { inTrainingMode: true },
     { $set: { inTrainingMode: false } }
   )
   ```

3. **Restore Previous Version**:
   ```bash
   git checkout [previous-commit]
   npm run dev
   ```

## Performance Benchmarks

Expected response times:
- Enrollment trigger → Welcome message: < 2s
- Session delivery: < 1s
- Q&A response: < 3s (depends on OpenAI API)
- Menu display: < 500ms
- Navigation commands: < 1s

## Next Steps After Testing

1. ✅ Verify all test scenarios pass
2. 📊 Set up monitoring dashboards
3. 📝 Document any issues found
4. 🔄 Run load tests with 10+ concurrent partners
5. 🎓 Create training content for all 7-8 sessions
6. 🚀 Deploy to production
7. 📢 Announce to partners

---

**Happy Testing! 🚀**

For issues or questions, check:
- Server logs: `npm run dev`
- MongoDB: `mongosh` → check collections
- Documentation: `WHATSAPP_TRAINING_FLOW.md`
