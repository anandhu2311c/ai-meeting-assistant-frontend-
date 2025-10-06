# 🚀 Complete Setup Guide

## Current Status
✅ **API Keys**: Already configured (Gemini, Pinecone, Deepgram, Groq)  
✅ **Backend Code**: Complete FastAPI application with PostgreSQL and S3 support  
✅ **Frontend Code**: Complete Next.js application with authentication  
⏳ **Database**: Needs PostgreSQL setup  
⏳ **File Storage**: Needs S3 setup (optional for local testing)  

## 🎯 Quick Start (Recommended)

### Step 1: Install PostgreSQL Locally

**Option A - Download Installer:**
1. Go to https://www.postgresql.org/download/windows/
2. Download and run the installer
3. During installation, remember your postgres user password
4. Default port 5432 is fine

**Option B - Using Package Manager:**
```powershell
# If you have Chocolatey:
choco install postgresql

# If you have winget:
winget install PostgreSQL.PostgreSQL
```

### Step 2: Create Database

**Option A - Using pgAdmin (GUI):**
1. Open pgAdmin 4 (installed with PostgreSQL)
2. Connect to PostgreSQL server
3. Right-click "Databases" → Create → Database
4. Name: `meeting_assistant`

**Option B - Using Command Line:**
```powershell
# Replace 'yourpassword' with your postgres password
createdb -U postgres -h localhost meeting_assistant
```

### Step 3: Update Backend Configuration

Edit `backend/.env` file and update this line:
```env
POSTGRES_PASSWORD=your-actual-postgres-password-here
```

### Step 4: Test the Setup

```powershell
# Go to backend directory
cd backend

# Run the quick setup script
python quick_setup.py

# Or test manually
python test_aws_setup.py
```

### Step 5: Start the Application

**Terminal 1 - Backend:**
```powershell
cd backend
uvicorn app.main:app --reload --port 8000
```

**Terminal 2 - Frontend:**
```powershell
# In root directory
npm run dev
```

**Visit:** http://localhost:3000

## 🏗️ Production AWS Setup (Optional)

If you want to deploy to production with AWS:

### 1. AWS Account Setup

1. Create AWS account: https://aws.amazon.com/
2. Install AWS CLI: https://aws.amazon.com/cli/
3. Configure AWS CLI: `aws configure`

### 2. Create AWS RDS PostgreSQL

```bash
aws rds create-db-instance \
  --db-instance-identifier meeting-assistant-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username postgres \
  --master-user-password YOUR_SECURE_PASSWORD \
  --allocated-storage 20 \
  --db-name meeting_assistant \
  --publicly-accessible \
  --backup-retention-period 7
```

### 3. Create AWS S3 Bucket

```bash
# Replace UNIQUE-SUFFIX with something unique
aws s3 mb s3://meeting-assistant-files-UNIQUE-SUFFIX

# Set CORS for web uploads
aws s3api put-bucket-cors \
  --bucket meeting-assistant-files-UNIQUE-SUFFIX \
  --cors-configuration '{
    "CORSRules": [{
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
      "AllowedOrigins": ["http://localhost:3000", "https://yourdomain.com"],
      "ExposeHeaders": []
    }]
  }'
```

### 4. Create IAM User for Application

```bash
# Create user
aws iam create-user --user-name meeting-assistant-app

# Create policy for S3 access
aws iam put-user-policy \
  --user-name meeting-assistant-app \
  --policy-name S3Access \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::meeting-assistant-files-UNIQUE-SUFFIX",
        "arn:aws:s3:::meeting-assistant-files-UNIQUE-SUFFIX/*"
      ]
    }]
  }'

# Create access key
aws iam create-access-key --user-name meeting-assistant-app
```

### 5. Update Backend .env for AWS

```env
# Replace with your actual AWS values
POSTGRES_HOST=your-rds-endpoint.region.rds.amazonaws.com
POSTGRES_PASSWORD=your-rds-password
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
S3_BUCKET_NAME=meeting-assistant-files-UNIQUE-SUFFIX
```

## 🛠️ Troubleshooting

### PostgreSQL Issues

**Connection Failed:**
```powershell
# Check if PostgreSQL is running
Get-Service postgresql*

# Start PostgreSQL service if stopped
Start-Service postgresql-x64-14  # or your version
```

**Database doesn't exist:**
```sql
-- Connect to postgres database first, then:
CREATE DATABASE meeting_assistant;
```

**Permission denied:**
```powershell
# Make sure you're using correct username/password
psql -U postgres -h localhost -d meeting_assistant
```

### Backend Issues

**Import errors:**
```powershell
# Make sure virtual environment is activated
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

**Database connection errors:**
- Check PostgreSQL is running
- Verify password in .env file
- Ensure database exists

### Frontend Issues

**API connection errors:**
- Ensure backend is running on port 8000
- Check NEXT_PUBLIC_API_URL in .env.local

**Authentication errors:**
- Clear browser localStorage
- Check backend logs for detailed errors

## 📞 Need Help?

### Check These First:
1. **Backend health**: http://localhost:8000/health
2. **Backend logs**: Check terminal running uvicorn
3. **Frontend logs**: Check browser console (F12)
4. **Database connection**: Run `python test_aws_setup.py`

### Common Commands:
```powershell
# Test backend connection
curl http://localhost:8000/health

# Check PostgreSQL status
Get-Service postgresql*

# Clear browser storage
# In browser console: localStorage.clear()

# Reset database (if needed)
dropdb -U postgres meeting_assistant
createdb -U postgres meeting_assistant
```

## 🎉 Success Checklist

- [ ] PostgreSQL installed and running
- [ ] Database 'meeting_assistant' created
- [ ] Backend .env file configured
- [ ] Backend starts without errors: `uvicorn app.main:app --reload --port 8000`
- [ ] Frontend starts without errors: `npm run dev`
- [ ] Can visit http://localhost:3000
- [ ] Can register new user account
- [ ] Can login and access meeting interface
- [ ] Can upload documents (local storage for now, S3 optional)

Once you complete the quick start, your application will be fully functional for local development!