# Admin Features Testing Guide

## Quick Start Testing

### Feature 1: Application Deletion

**Test Step 1: Open Admin Dashboard**
1. Go to `admin.html`
2. Login with admin credentials
3. Navigate to "Applications" section

**Test Step 2: Find and Delete an Application**
1. Locate any application in the table
2. Click the red "Delete" button in the Actions column
3. Verify confirmation modal appears showing:
   - Student name
   - Student email
   - University
   - Programme
   - Status
   - Submitted date

**Test Step 3: Test Cancellation**
1. Click "Cancel" button
2. Verify modal closes
3. Verify application still exists in table

**Test Step 4: Perform Deletion**
1. Click "Delete" button again
2. Click "Confirm Delete" button
3. Verify success toast message: "Application deleted"
4. Verify application removed from table
5. Verify dashboard stats update (applications count should decrease)

**Test Step 5: Verify Audit Log**
1. Open Firestore console
2. Navigate to `auditLogs` collection
3. Find entry with `action: DELETE_APPLICATION`
4. Verify fields:
   - `adminEmail`: Your login email
   - `deletedApplicationSummary`: Student name and details
   - `createdAt`: Current timestamp
   - `documentId`: ID of deleted application

---

### Feature 2: Agent Details & Analytics

**Test Step 1: Open Agents Section**
1. In Admin Dashboard, click "Agents" in sidebar
2. Verify agents list loads with all agents

**Test Step 2: Open Agent Details**
1. Find any agent with data (referrals, clicks, applications)
2. Click "View Details" button in Actions column
3. Verify modal opens with loading state briefly
4. Wait for modal content to load

**Test Step 3: Verify Profile Section**
Modal should display:
- Agent name
- Email
- Phone
- Country
- Status
- Referral Code
- Referral URL
- Commission Structure
- Created date

**Test Step 4: Verify Referral Links Section**
- Check if agent has referral links
- Verify table shows: Code, Status, Created date
- If no links: "No referral links created yet" message

**Test Step 5: Verify Referral Visit Analytics**
Look for metrics:
- Total Visits (blue card)
- Today (green card)
- This Week (yellow card)
- This Month (pink card)
- Latest Visit time
- Most Visited Page

**Test Step 6: Verify WhatsApp Analytics**
Look for metrics:
- Total Clicks (teal card)
- Today (blue card)
- This Week (green card)
- This Month (yellow card)
- Latest Click time
- Top Number (phone number)
- Top Page (page clicked from)

**Test Step 7: Verify Application Analytics**
Look for metrics:
- Total Applications (red card)
- Conversion Rate % (gray card)
- Linked Students (green card)
- Status Breakdown grid showing counts for:
  - new
  - contacted
  - applied
  - offer
  - enrolled
  - rejected
- Latest Application date

**Test Step 8: Verify Recent Applications Table**
If agent has applications:
- Check table shows first 10 applications
- Verify columns: Student, University, Programme, Status, Date
- Verify data is correct

**Test Step 9: Test Modal Close**
- Click X button to close
- Verify modal closes smoothly
- Verify overlay closes

**Test Step 10: Test with Different Agents**
- Open details for agent with no data
- Verify "No referral links", empty status counts
- Verify graceful handling of missing data
- Verify no error messages

---

## Testing Checklist

### Functional Tests
- [ ] Delete button appears on all application rows
- [ ] Delete confirmation modal shows correct data
- [ ] Cancel button works without deleting
- [ ] Confirm delete removes application from database
- [ ] Toast message shows on successful delete
- [ ] Audit log is created with admin email
- [ ] Application count decreases on dashboard
- [ ] View Details button appears on all agent rows
- [ ] Agent details modal opens without errors
- [ ] All analytics load correctly
- [ ] Modal close button works
- [ ] Modal can be dismissed (click overlay or close button)

### Data Accuracy Tests
- [ ] Delete confirmation shows exact student information
- [ ] Deleted application cannot be found in Firestore
- [ ] Audit log has correct admin email
- [ ] Agent analytics counts match Firestore data
- [ ] Visit/click counts are accurate
- [ ] Application status breakdown is correct
- [ ] Conversion rate calculation is correct

### Error Handling Tests
- [ ] Non-admin users cannot delete (Firestore rules enforce)
- [ ] Error message shown if deletion fails
- [ ] Error message shown if agent stats fail to load
- [ ] Missing agent shows appropriate error
- [ ] Loading state shown while data fetches
- [ ] Modal handles agents with no data gracefully

### UI/UX Tests
- [ ] Modal appears smoothly with animation
- [ ] Modal is readable on mobile (responsive)
- [ ] Dark mode displays correctly
- [ ] Buttons have hover states
- [ ] Toast notifications appear and disappear
- [ ] Color-coded cards display properly
- [ ] Tables format correctly on all screen sizes
- [ ] Text doesn't overflow or break layout

### Performance Tests
- [ ] Modal opens within 1-2 seconds
- [ ] Stats load within 2-3 seconds
- [ ] No console errors
- [ ] No memory leaks after closing modal
- [ ] Smooth scrolling in long modals
- [ ] No lag when clicking buttons repeatedly

---

## Common Test Scenarios

### Scenario 1: Delete Application with No Guardian Info
**Expected**: Modal shows N/A for missing guardian fields, delete still works

### Scenario 2: Agent with 1000+ Visits
**Expected**: All analytics load correctly, table shows first 10 apps, no lag

### Scenario 3: Agent with No Referral Links
**Expected**: "No referral links created yet" message shows, no errors

### Scenario 4: Delete Last Application for Agent
**Expected**: Application deleted, agent record still exists with 0 applications

### Scenario 5: Rapid Delete Clicks
**Expected**: Only one delete triggered, subsequent clicks disabled or queued

### Scenario 6: Network Error During Delete
**Expected**: Error message shown, application not deleted, no partial state

---

## Browser Testing

Test on:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

---

## Firestore Rules Verification

Verify these rules are in place:

**Applications delete rule:**
```firestore
allow delete: if isAdminUser();
```

**Audit Logs create rule:**
```firestore
allow create: if isAdminUser();
```

**All read permissions** for analytics queries are working for admin users.

---

## Deployment Checklist

Before deploying to production:

- [ ] All tests in this guide have passed
- [ ] No console errors in developer tools
- [ ] Firestore rules deployed
- [ ] Admin user created with proper permissions
- [ ] Firebase project ID is correct (horizons-cee8d)
- [ ] Backup of current Firestore data (optional but recommended)
- [ ] Tested with real admin account
- [ ] Tested on mobile device
- [ ] Audit logs verified to be creating correctly

**Deploy Command:**
```bash
firebase deploy
```

---

## Troubleshooting

### Issue: Delete button doesn't appear
**Solution**: 
- Check that admin is logged in
- Check browser console for errors
- Verify admin.js loaded correctly
- Try hard refresh (Ctrl+Shift+R)

### Issue: Confirmation modal shows blank data
**Solution**:
- Check application has student.name field
- Check student object exists in application
- Verify getProgrammeDisplay() function works

### Issue: Agent details modal shows error
**Solution**:
- Verify agent exists in Firestore
- Check browser console for specific error
- Verify Firestore rules allow admin read access
- Check network tab for failed requests

### Issue: Analytics numbers don't match
**Solution**:
- Verify filtering logic (agentId vs referralCode)
- Check timestamp calculations
- Manually query Firestore to verify data
- Clear browser cache and reload

### Issue: Modal doesn't close
**Solution**:
- Check that overlay close handlers work
- Try pressing Escape key
- Check for JavaScript errors in console
- Reload page

---

## Performance Baseline

Expected performance metrics:

- Modal open animation: < 300ms
- Agent stats load: 1-3 seconds (depending on data volume)
- Delete operation: < 1 second
- Audit log creation: < 500ms
- Modal responsive: No noticeable lag on typical admin data

---

**Testing Guide Created: 2026-05-24**
**Last Updated: 2026-05-24**
