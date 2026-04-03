# User Guides

---

## Buyer Guide

### 1. Sign In
- Click **Sign In** and choose Google, Apple, or Microsoft
- You'll be redirected back automatically after authentication

### 2. Search for Books
- Use the search bar on the homepage or `/search`
- Filter by **category**, **condition** (1–5), or **price range**
- Sort by relevance, price, condition, date, or proximity
- Click any listing card to view full details

### 3. View a Listing
- See book details, condition breakdown, and pricing
- The **final price** includes delivery cost, platform commission, and payment fees
- Click **Place Order** to proceed

### 4. Place an Order
- Enter your delivery address
- Click **Proceed to Payment**
- The Razorpay checkout modal opens — pay via UPI, card, net banking, or wallet
- After payment, you'll see a confirmation screen

### 5. Track Your Order
- Go to **My Orders** from the dashboard
- Click an order to see its status and live tracking
- You'll receive real-time notifications as the shipment progresses

### 6. Leave a Review
- After your order is marked **Delivered**, a **Leave a Review** button appears
- Rate the seller (1–5 stars) and leave a comment

### 7. Wishlist
- Click the ❤️ icon on any listing to save it to your wishlist
- View saved listings at `/wishlist`

---

## Seller Guide

### 1. Sign In
Same as buyers — use Google, Apple, or Microsoft OAuth.

### 2. Create a Listing

**Step 1 — Upload Photos**
- Upload 4 photos: front cover, back cover, spine, and pages
- JPEG or PNG, max 5 MB each

**Step 2 — AI Scan**
- The AI automatically extracts title, author, ISBN, publisher, edition, and condition score
- Wait for the scan to complete (usually under 10 seconds)

**Step 3 — Review Details**
- Check the AI-extracted data
- Fill in category, description, and your location

**Step 4 — Confirm & Submit**
- Review the pricing breakdown (base price, delivery, commission, fees, your payout)
- Click **Submit Listing** — it goes to admin for approval

### 3. Listing Approval
- Your listing starts as **Pending Approval**
- You'll get a real-time notification when it's approved or rejected
- If rejected, the reason is shown — fix the issue and resubmit
- Approved listings appear in search results immediately

### 4. Manage Listings
- Go to **Seller Dashboard → My Listings**
- Filter by status: active, pending, rejected, sold
- Edit or delete listings that aren't sold yet

### 5. Handle Orders
- When a buyer places an order, you'll get a notification
- Go to **My Orders** to see buyer details and delivery address
- Once payment is confirmed, generate the shipping label from the order page
- Print the label, pack the book, and wait for courier pickup

### 6. Track Earnings
- Go to **Seller Dashboard → Earnings**
- See total sales, platform commission deducted, and your net payout per order

---

## Admin Guide

### 1. Access the Admin Dashboard
- Sign in with an account that has the `admin` role
- Navigate to `/admin`

### 2. Moderate Listings
- Go to **Pending Listings** to see all listings awaiting approval
- For each listing you can:
  - **Approve** — listing goes live in search
  - **Reject** — provide a reason; seller is notified
  - **Request Rescan** — ask seller to re-photograph the book

### 3. Manage Users
- Go to **User Management**
- Actions available:
  - **Suspend** — block a user until a specified date
  - **Warn** — send a warning notification
  - **Limit Listings** — cap how many active listings a seller can have

### 4. View Analytics
- **Dashboard** shows platform overview: total listings, sales, revenue, eco-impact
- **Analytics** tab shows charts: daily sales, listings per day, revenue by category

### 5. Moderation Logs
- All admin actions are logged with timestamp, admin ID, action, and reason
- View the full log at **Moderation Logs** with date/action filters

### 6. Process Refunds
- Go to the order in question
- Use the **Refund** button (or call `POST /api/payments/:id/refund`)
- Specify full or partial refund amount
- Refund is processed via Razorpay and the payment record is updated
