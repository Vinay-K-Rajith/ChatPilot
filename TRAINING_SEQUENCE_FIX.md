# Training Progress Sequential Fix

## Problem

Training progress was showing **non-sequential section numbers** (e.g., 2, 4, 6, 8, 9) instead of following the actual `s_no` sequence from `Training_KB`.

### Root Cause

The code was using **arithmetic increments** (`currentSection + 1`) instead of looking up the **actual next section by position** in the Training_KB array.

```typescript
// ❌ WRONG: Assumes sections are numbered 1, 2, 3, 4...
$set: { currentSection: sectionNo + 1 }  // If sectionNo = 4, sets to 5
```

But Training_KB sections can have **ANY s_no values** like:
- Section 1: s_no = 1
- Section 2: s_no = 3
- Section 3: s_no = 5
- Section 4: s_no = 10

When the code did `currentSection + 1`, it would jump to non-existent sections.

---

## Solution: Position-Based Navigation

Changed from **arithmetic** to **position-based** lookups:

```typescript
// ✓ CORRECT: Find section by position in sorted array
const sections = await getTrainingSections();  // Already sorted by s_no
const currentIndex = sections.findIndex(s => s.s_no === currentSection);
const nextIndex = currentIndex + 1;
const nextSNo = sections[nextIndex]?.s_no;  // Get actual s_no at next position
```

---

## Files Changed

### 1. **mongodb.service.ts**

#### `initializeTrainingProgress()` (Line 1029)
**Before:**
```typescript
currentSection: 1  // Hardcoded assumption
```

**After:**
```typescript
const sections = await this.getTrainingSections();
const firstSectionSNo = sections.length > 0 ? sections[0].s_no : 1;
currentSection: firstSectionSNo  // Use actual first section's s_no
```

#### `startTrainingMode()` (Line 1198)
**Before:**
```typescript
currentSection: 1  // Hardcoded
```

**After:**
```typescript
const sections = await this.getTrainingSections();
const firstSectionSNo = sections.length > 0 ? sections[0].s_no : 1;
currentSection: firstSectionSNo
```

#### `markSectionCompleted()` (Line 1104)
**Before:**
```typescript
$addToSet: { completedSections: sectionNo },
$set: { 
  currentSection: sectionNo + 1,  // ❌ Arithmetic increment
  lastUpdated: new Date()
}
```

**After:**
```typescript
$addToSet: { completedSections: sectionNo },
$set: { lastUpdated: new Date() }  // ✓ No longer auto-advances
```

**Note:** Separated concerns - marking complete vs. moving to next section.

#### `moveToNextSection()` (Line 1253)
**Before:**
```typescript
const nextSection = (progress?.currentSection || 1) + 1;  // ❌ Arithmetic
```

**After:**
```typescript
const sections = await this.getTrainingSections();
const currentIndex = sections.findIndex(s => s.s_no === currentSNo);
const nextIndex = currentIndex + 1;
const nextSNo = nextIndex < sections.length ? sections[nextIndex].s_no : currentSNo;
```

#### `moveToPreviousSection()` (Line 1276)
**Before:**
```typescript
const prevSection = Math.max(1, (progress?.currentSection || 1) - 1);  // ❌ Arithmetic
```

**After:**
```typescript
const sections = await this.getTrainingSections();
const currentIndex = sections.findIndex(s => s.s_no === currentSNo);
const prevIndex = Math.max(0, currentIndex - 1);
const prevSNo = sections[prevIndex]?.s_no || sections[0]?.s_no || 1;
```

---

### 2. **twilio.service.ts**

#### `startTrainingFlow()` (Line 476)
**Before:**
```typescript
await this.sendTrainingSection(phone, 1);  // Hardcoded
```

**After:**
```typescript
const firstSectionSNo = sections[0].s_no;
await this.sendTrainingSection(phone, firstSectionSNo);
```

#### `handleNextSection()` (Line 677)
**Before:**
```typescript
const nextSection = currentSection + 1;  // ❌ Arithmetic
if (nextSection > sections.length) { /* completion */ }
```

**After:**
```typescript
const currentIndex = sections.findIndex(s => s.s_no === currentSection);
const nextIndex = currentIndex + 1;
if (nextIndex >= sections.length) { /* completion */ }

// Mark all sections using actual s_no values
for (const section of sections) {
  if (!progress?.completedSections.includes(section.s_no)) {
    await markSectionCompleted(phone, section.s_no);
  }
}
```

#### `handlePreviousSection()` (Line 708)
**Before:**
```typescript
if (currentSection <= 1) { /* at first */ }  // ❌ Assumes first is 1
```

**After:**
```typescript
const currentIndex = sections.findIndex(s => s.s_no === currentSection);
if (currentIndex <= 0) { /* at first */ }  // ✓ Position-based
```

#### `handleJumpToSection()` (Line 770)
**Before:**
```typescript
if (targetSection < 1 || targetSection > sections.length) { /* invalid */ }
```

**After:**
```typescript
const targetSection = sections.find(s => s.s_no === targetSectionSNo);
if (!targetSection) { /* invalid */ }  // ✓ Lookup by s_no
```

#### `handleRestartTraining()` (Line 757)
**Before:**
```typescript
await this.mongodbService.updateCurrentSection(phone, 1);
await this.sendTrainingSection(phone, 1);
```

**After:**
```typescript
const firstSectionSNo = sections[0].s_no;
await this.mongodbService.updateCurrentSection(phone, firstSectionSNo);
await this.sendTrainingSection(phone, firstSectionSNo);
```

---

## How It Works Now

### Example: Training_KB with Non-Sequential s_no

```json
[
  { "s_no": 5,  "heading": "First Intro & Communication Protocol" },
  { "s_no": 7,  "heading": "General Revision & Q&A" },
  { "s_no": 10, "heading": "Advanced Topics" }
]
```

### Navigation Flow

1. **Start Training**
   - Finds first section: `s_no = 5`
   - Sets `currentSection = 5`

2. **User Clicks "Next"**
   - Current: `s_no = 5` (index 0)
   - Finds next by position: index 1
   - Next section: `s_no = 7`
   - Marks `5` as completed
   - Sets `currentSection = 7`

3. **User Clicks "Next" Again**
   - Current: `s_no = 7` (index 1)
   - Finds next by position: index 2
   - Next section: `s_no = 10`
   - Marks `7` as completed
   - Sets `currentSection = 10`

4. **User Clicks "Next" (At Last Section)**
   - Current: `s_no = 10` (index 2)
   - Next index: 3 (>= sections.length)
   - **Completion triggered**
   - Marks `10` as completed
   - Marks all sections complete: `[5, 7, 10]`

### Database State

**After completing all:**
```json
{
  "phone": "+1234567890",
  "completedSections": [5, 7, 10],      // ✓ Actual s_no values
  "currentSection": 10,
  "inTrainingMode": true
}
```

---

## Key Principles

### 1. **Never Assume Sequential s_no**
- Don't use `sectionNo + 1` or `sectionNo - 1`
- Always lookup by position in sorted array

### 2. **Separation of Concerns**
- `markSectionCompleted()` only marks complete (no navigation)
- `moveToNextSection()` only advances pointer (no completion)
- Caller controls the sequence

### 3. **Always Use getTrainingSections()**
- Single source of truth for section order
- Already sorted by `s_no` in MongoDB query

### 4. **Validate by Lookup, Not Range**
```typescript
// ❌ Bad: Assumes numeric range
if (targetSection < 1 || targetSection > sections.length)

// ✓ Good: Lookup actual section
if (!sections.find(s => s.s_no === targetSection))
```

---

## Testing Scenarios

### Scenario 1: Sequential s_no (1, 2, 3, 4, 5)
- Should work as before
- Progress: 1 → 2 → 3 → 4 → 5

### Scenario 2: Non-Sequential s_no (5, 7, 10)
- **Before Fix:** 5 → 6 (error) → 7 (skip) → 8 (error) ...
- **After Fix:** 5 → 7 → 10 ✓

### Scenario 3: Large Gaps (1, 100, 1000)
- **Before Fix:** 1 → 2 (error) → 3 (error) ...
- **After Fix:** 1 → 100 → 1000 ✓

### Scenario 4: Jump to Section
- User types "section 7"
- **Before Fix:** Checks if 7 <= length (would fail if s_no ≠ index)
- **After Fix:** Looks up section with `s_no = 7` ✓

---

## Migration for Existing Users

If users already have incorrect `completedSections` or `currentSection` values:

```typescript
// Optional cleanup script (run once)
async function migrateTrainingProgress() {
  const allProgress = await db.collection('Training_Progress').find({}).toArray();
  const sections = await getTrainingSections();
  
  for (const progress of allProgress) {
    // Filter out invalid section numbers
    const validCompleted = progress.completedSections.filter(
      sNo => sections.some(s => s.s_no === sNo)
    );
    
    // Reset current to first if invalid
    const validCurrent = sections.some(s => s.s_no === progress.currentSection)
      ? progress.currentSection
      : sections[0].s_no;
    
    await db.collection('Training_Progress').updateOne(
      { phone: progress.phone },
      {
        $set: {
          completedSections: validCompleted,
          currentSection: validCurrent
        }
      }
    );
  }
}
```

---

## Summary

✓ **Training now follows actual Training_KB s_no sequence**
✓ **No more arithmetic assumptions (sectionNo + 1)**
✓ **Position-based navigation using sorted array**
✓ **Works with any s_no values (sequential or not)**
✓ **Proper validation by lookup, not range checks**
✓ **TypeScript compilation passes**

All training navigation (Next, Previous, Jump, Restart) now respects the actual `s_no` values from Training_KB.
