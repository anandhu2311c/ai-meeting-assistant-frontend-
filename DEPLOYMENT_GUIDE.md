# 🚀 Production Deployment Guide

## Prerequisites
- AWS Account with RDS PostgreSQL database
- Domain name (optional but recommended)
- Vercel account
- EC2 instance (t3.medium or larger recommended)

## Part 1: Deploy Backend to EC2

### Step 1: Launch EC2 Instance
1. Launch Amazon Linux 2023 instance (t3.medium recommended)
2. Configure security group:
   - Port 22 (SSH) - Your IP only
   - Port 80 (HTTP) - 0.0.0.0/0
   - Port 443 (HTTPS) - 0.0.0.0/0
   - Port 8000 (FastAPI) - 0.0.0.0/0 (temporary for testing)
3. Create or use existing key pair

### Step 2: Connect and Setup
```bash
# Connect to EC2
ssh -i your-key.pem ec2-user@your-ec2-public-ip

# Upload your code to EC2 (from local machine)
scp -i your-key.pem -r backend ec2-user@your-ec2-public-ip:/home/ec2-user/

# On EC2: Run setup script
cd backend
chmod +x deploy/setup-ec2.sh
./deploy/setup-ec2.sh
```

### Step 3: Configure Environment
```bash
# Copy environment file
cp deploy/.env.production .env

# Edit the .env file with your actual values
nano .env
```

**Important**: Update these values in .env:
- `DATABASE_URL`: Your RDS PostgreSQL connection string
- `AWS_ACCESS_KEY_ID` & `AWS_SECRET_ACCESS_KEY`: Your AWS credentials
- `S3_BUCKET_NAME`: Your S3 bucket name
- `SECRET_KEY`: Generate a secure secret key
- `ALLOWED_HOSTS`: Add your Vercel app domain

### Step 4: Deploy Application
```bash
# Make deploy script executable
chmod +x deploy/deploy.sh

# Run deployment
./deploy/deploy.sh
```

### Step 5: Test Backend
```bash
# Test the API
curl http://your-ec2-public-ip/health

# Check logs if needed
sudo journalctl -u interview-assistant -f
```

## Part 2: Deploy Frontend to Vercel

### Step 1: Prepare Repository
1. Push your code to GitHub/GitLab
2. Make sure `vercel.json` is in your root directory

### Step 2: Deploy to Vercel
1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "New Project"
3. Import your repository
4. Configure environment variables:
   - `NEXT_PUBLIC_API_URL`: `http://your-ec2-public-ip` or `https://your-domain.com`

### Step 3: Update CORS Settings
After getting your Vercel URL, update the backend CORS settings:

```bash
# On EC2, edit the .env file
nano /var/www/interview-assistant/backend/.env

# Update ALLOWED_HOSTS with your Vercel URL
ALLOWED_HOSTS=["https://your-vercel-app.vercel.app", "https://your-domain.com"]

# Restart the service
sudo systemctl restart interview-assistant
```

## Part 3: SSL Setup (Recommended)

### Option 1: Using Let's Encrypt (Free)
```bash
# Install certbot
sudo yum install -y certbot python3-certbot-nginx

# Get SSL certificate (replace with your domain)
sudo certbot --nginx -d your-domain.com

# Auto-renewal is set up automatically
```

### Option 2: Using AWS Certificate Manager
1. Request a certificate in AWS Certificate Manager
2. Set up an Application Load Balancer
3. Configure the ALB to use the certificate

## Part 4: Domain Setup (Optional)
1. Point your domain A record to your EC2 public IP
2. Update nginx configuration with your domain
3. Update Vercel custom domain settings

## Testing the Deployment

### Backend Tests
```bash
# Health check
curl https://your-domain.com/health

# Login test
curl -X POST https://your-domain.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"testpass"}'
```

### Frontend Tests
1. Visit your Vercel URL
2. Test login functionality
3. Test document upload
4. Check browser console for any errors

## Monitoring and Maintenance

### View Logs
```bash
# Application logs
sudo journalctl -u interview-assistant -f

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Update Application
```bash
# Pull latest changes
cd /var/www/interview-assistant
git pull origin main

# Restart service
sudo systemctl restart interview-assistant
```

## Security Checklist
- [ ] Change default SECRET_KEY
- [ ] Use strong database passwords
- [ ] Enable SSL/HTTPS
- [ ] Configure proper security groups
- [ ] Set up CloudWatch monitoring
- [ ] Regular security updates
- [ ] Backup database regularly

## Troubleshooting

### Common Issues
1. **502 Bad Gateway**: Check if FastAPI service is running
2. **CORS Errors**: Verify ALLOWED_HOSTS in backend .env
3. **Database Connection**: Check RDS security groups and connection string
4. **File Upload Issues**: Verify S3 bucket permissions and CORS

### Useful Commands
```bash
# Check service status
sudo systemctl status interview-assistant nginx

# Restart services
sudo systemctl restart interview-assistant nginx

# View real-time logs
sudo journalctl -u interview-assistant -f
```

## Cost Optimization
- Use t3.small for development/testing
- Set up auto-scaling for production
- Use CloudFront CDN for static assets
- Monitor AWS costs regularly