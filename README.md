# AegisPay - AI-Shielded UPI Payment Simulation & Real-Time Fraud Detection

A modern fintech UPI payment simulation web application demonstrating real-time fraud detection using Artificial Intelligence and Explainable AI (XAI).

> **Note**: This application is a simulation environment designed for demonstration, educational, and research evaluation. No real money or actual banking APIs are used.

---

## 🚀 Live Services

- **Frontend Application**: [http://localhost:5173](http://localhost:5173) (React + Vite + Tailwind CSS + Framer Motion)
- **Flask AI Backend**: [http://127.0.0.1:5000](http://127.0.0.1:5000) (XGBoost + Keras Autoencoder + SHAP)

### Default Demo Credentials
- **Email**: `demo@aegispay.com`
- **Password**: `password123`
- *(Or click the "Fill Demo Login" button on the login screen for instant 1-click access)*

---

## 🧠 AI & Detection Architecture

AegisPay deploys a **hybrid multi-layer defense engine**:

```
                       ┌──────────────────────────────┐
                       │   Client Device Telemetry    │
                       │ (Hardware FP, Geolocation,   │
                       │   Network, Time, Battery)    │
                       └──────────────┬───────────────┘
                                      │
                                      ▼
                       ┌──────────────────────────────┐
                       │  Feature Engineering Engine  │
                       │ (Amount Ratio, Velocity 1h,  │
                       │  Haversine Distance, VPA)    │
                       └───────┬──────────────┬───────┘
                               │              │
                ┌──────────────┘              └──────────────┐
                ▼                                            ▼
   ┌───────────────────────────┐              ┌───────────────────────────┐
   │     XGBoost Classifier    │              │      Deep Autoencoder     │
   │ (Supervised Decision Tree │              │    (Unsupervised Anomaly  │
   │       Ensemble)           │              │     Reconstruction MSE)   │
   └────────────┬──────────────┘              └──────────────┬────────────┘
                │                                            │
                │ P(Fraud | Features)                        │ Reconstruction Loss
                └──────────────┬──────────────┬──────────────┘
                               │              │
                               ▼              ▼
                       ┌──────────────────────────────┐
                       │    SHAP Explainer Engine     │
                       │ (TreeExplainer Shapley Alloc)│
                       └──────────────┬───────────────┘
                                      │
                                      ▼
                       ┌──────────────────────────────┐
                       │    Hybrid Decision Engine    │
                       │   (Threshold & Rule Logic)   │
                       └──────────────┬───────────────┘
                                      │
                       ┌──────────────┴───────────────┐
                       ▼                              ▼
                 ✅ APPROVED                     ❌ BLOCKED
                                                      │
                                                      ▼
                                              🔐 Step-Up OTP
                                               Verification
```

1. **XGBoost Supervised Gradient-Boosted Trees**:
   - Ingests 14 dimensional behavioral, temporal, and metadata features.
   - Evaluates statistical correlation with fraudulent UPI patterns (imbalanced learning with `scale_pos_weight`).
2. **Deep Autoencoder (TensorFlow / Keras)**:
   - Deep neural network (`32 -> 16 -> 8 bottleneck -> 16 -> 32 -> Reconstruction`).
   - Trained exclusively on safe, legitimate transaction vectors.
   - At inference, calculates Mean Squared Error (MSE). Normal behavior reconstructs cleanly; anomalous transactions produce high reconstruction error.
3. **SHAP (SHapley Additive exPlanations)**:
   - Computes local attribution values for every transaction.
   - Accurately details which features increased or decreased fraud probability (e.g. `+35% Amount Spike`, `+20% New Device`, `-15% Known Merchant`).

---

## 💻 Tech Stack

### Frontend
- **React 19** + **Vite 8**
- **Tailwind CSS v4**
- **Framer Motion** (Smooth transitions & 3-4s verification animation)
- **Recharts** (Interactive Confusion Matrix, ROC Curves, PR Curves, Pie Charts, Bar Charts)
- **Lucide React Icons**
- **Axios**
- **Canvas-Confetti**

### Backend
- **Flask** (Python 3.11)
- **XGBoost**
- **TensorFlow / Keras** (Deep Autoencoder)
- **SHAP** (`TreeExplainer`)
- **Scikit-Learn**
- **SQLAlchemy** (SQLite local storage, extensible to PostgreSQL/MySQL via `DATABASE_URL`)

---

## 🎨 Theme & UI System

- **Primary**: `#2563EB` (Fintech Electric Blue)
- **Secondary**: `#0F172A` (Navy Slate)
- **Success**: `#22C55E` (Emerald Green)
- **Danger**: `#EF4444` (Vivid Crimson)
- **Background**: `#F8FAFC`
- **Cards**: Pure White, 16px rounded corners, glassmorphism blur where appropriate.

---

## 📱 Page Walkthrough

### 1. Login / Register (`/login`)
- Clean banking authentication interface.
- 1-click "Fill Demo Login" button.
- Toggle between Sign In and Account Creation.

### 2. Security Dashboard (`/`)
- **Key Metrics**: Total Transactions, Safe Cleared, Fraud Blocked, Fraud Rate %, Model Accuracy.
- **Charts**:
  - Donut Pie Chart: Fraud vs Safe distribution.
  - Line Chart: 7-Day daily volume breakdown.
  - Bar Chart: Weekly fraud anomaly trend.
- **Recent Transactions Table**: Live feed showing scores, status badges, and quick links.

### 3. Make Payment (`/payment`)
- Modeled after Google Pay and PhonePe UPI flows.
- Auto-filled sender UPI (`amansharma@aegis`) with live simulated balance display.
- **Demo Test Scenarios Bar**:
  - 🟢 **Safe Grocery**: ₹350 to `swiggy@icici` (Normal baseline).
  - 🟢 **Dinner Split**: ₹1,250 to `priya.sharma@okaxis` (Known contact).
  - 🟡 **High Amount Spike**: ₹38,000 (30x baseline spending).
  - 🔴 **Midnight Account Takeover**: ₹82,000 at 03:20 AM + New Device + 1,450 km location hop.
  - 🔴 **Phishing Velocity Burst**: ₹45,000 + VPN + Flagged Receiver VPA.
- **Silent Telemetry Collection**:
  - Automatically captures browser, OS, hardware fingerprint, canvas hash, screen resolution, timezone, language, network type, battery level, and geolocation.
- **3-4 Second Real-Time Verification Animation**:
  - 🔄 Initiating UPI Handshake
  - ✔ Verifying Hardware & Canvas Fingerprint
  - ✔ Analyzing Geolocation & Proxy Distance
  - ✔ Running XGBoost Trees
  - ✔ Running Deep Autoencoder Reconstruction
  - ✔ Generating Real-Time SHAP Explanations
  - ✔ Synthesizing Decision Engine Verdict
- **Decision Modal**:
  - Circular animated progress gauge.
  - Fraud Probability % and Risk Level (LOW, MEDIUM, HIGH).
  - Identified factor reasons (✓ or ⚠️).
  - Decision Card: Green (Approved) or Red (Blocked).
  - If Blocked: **Verify via Gmail Step-Up OTP** (Generates secure 6-digit dynamic OTP dispatched directly to user's registered Gmail address via SMTP, with sandbox auto-fill and demo bypass `123456`).

### 4. Transaction History (`/history`)
- Complete audit trail.
- Filter by: `All`, `Approved`, `Blocked`.
- Real-time search by ID, receiver name, or remarks.
- Interactive Pagination.
- **Download CSV**: Generates a standard `.csv` report of all current transaction records.
- **Detail Inspector Drawer**: Click any row to view individual telemetry, XGBoost probability, Autoencoder anomaly score, and SHAP breakdown.

### 5. Explainable AI Analytics (`/analytics`)
- **Academic Evaluation**:
  - Accuracy, Precision, Recall, F1 Score, ROC AUC.
  - Interactive **Confusion Matrix** with TN, FP, FN, TP, Specificity, and Sensitivity.
  - **ROC Curve** with shaded AUC area.
  - **Global Feature Importance** horizontal bar chart.
  - **Fraud Distribution** chart across transaction amount buckets.
  - **Interactive SHAP Waterfall Engine**: Step-by-step game-theoretic contribution breakdown comparing High Risk Anomaly, Phishing Burst, Dinner Split, and Safe Baseline.
- **✨ Google Gemini Generative AI Fraud Prediction & Intelligence**:
  - Grounded directly on real-time SHAP local attributions.
  - Generates executive fraud verdicts, AI confidence ratings, threat vector diagnosis, and regulatory enforcement protocols (RBI/NPCI).
  - Supports live database transaction inspection and interactive Q&A console ("Ask Gemini about this SHAP explanation").

---

## 🛠️ Installation & Manual Execution

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm

### 1. Backend Setup
```bash
cd backend
pip install -r requirements.txt
python app.py
```
*Backend runs on `http://127.0.0.1:5000`.*

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
*Frontend runs on `http://localhost:5173`.*
