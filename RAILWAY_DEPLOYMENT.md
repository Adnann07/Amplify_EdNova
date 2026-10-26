# Backend Deployment to Railway

## Laravel Authentication Service

The Laravel service handles `/api/login` and `/api/register`. Deploy it using
the repository's `Dockerfile`; keep the Python FastAPI service separate for
the Python-only endpoints.

1. Add a Railway MySQL service to the same project.
2. In the Laravel service's **Variables**, add references to the MySQL
   service's `MYSQLHOST`, `MYSQLPORT`, `MYSQLDATABASE`, `MYSQLUSER`, and
   `MYSQLPASSWORD` variables. For example, if the database service is named
   `MySQL`, set `MYSQLHOST` to `${{MySQL.MYSQLHOST}}` and add equivalent
   references for the other four variables. The Laravel configuration reads
   these names and selects MySQL when `MYSQLHOST` is present.
3. Set `APP_KEY` to a generated Laravel application key and `APP_DEBUG=false`.
4. Redeploy the Laravel service. The container runs
   `php artisan migrate --force` before starting Nginx and PHP-FPM, creating
   the auth tables.
5. Confirm the deployment logs show that migrations completed before testing
   login or registration.

## Prerequisites
- [Railway.app](https://railway.app) account
- GitHub repository (recommended for automatic deploys)
- Environment variables set up

## Critical: Avoid PHP Detection Issue

**Problem**: Railway detects the Laravel `composer.json` and tries to run PHP-FPM instead of Python.

**Solution**: Make sure to create a **separate Railway service** for the Python backend.

## Steps to Deploy to Railway

### 1. Create a New Project for Backend Only

Instead of adding to existing Laravel project:
- Go to [railway.app](https://railway.app)
- Click "Start a New Project"
- Select "Deploy from GitHub"
- **Select your repository**
- Railway will detect multiple services - **delete the Laravel service, keep only Python**

### 2. Force Python Detection

The deployment files will auto-detect Python:
- `runtime.txt` → Python 3.11.9
- `Procfile` → uvicorn command
- `nixpacks.toml` → explicit Python setup
- `backend/requirements.txt` → dependencies

### 3. Configure Environment Variables

In Railway dashboard → **Variables** tab, add:

```
FELCLOUD_API_KEY=your_server_side_key
FELCLOUD_BASE_URL=https://llm.felcloud.io/v1
FELCLOUD_COMPACT_MODEL=your_compact_model_id
FELCLOUD_MIDSIZE_MODEL=your_midsize_model_id
```

Keep the API key in Railway's server-side variables; never use a `VITE_` variable.

### 4. Get Your Backend URL

Once deployed successfully (should show green ✓):
- Go to **Deployments** tab
- Copy the URL: `https://amplifywebsite-backend-production.up.railway.app`

### 5. Update Frontend

Update your frontend to use the new backend URL:

**Option A: Environment Variable**
Create `frontend/.env.production`:
```
VITE_BACKEND_URL=https://your-railway-backend.up.railway.app
```

**Option B: Update Config Directly**
Edit `frontend/vite.config.js`:
```javascript
const backendUrl = 'https://your-railway-backend.up.railway.app';
```

### 6. Update Static HTML Files

If using static HTML files (deeplearn.html, classroomai.html), update hardcoded URLs:

Current setup uses relative paths (`/api`, `/turn`), so it should work automatically if frontend is served from the same domain.

## Troubleshooting

### "Immediately stopping" or "Stopping Container"
- Check Railway logs for actual error
- Make sure `nixpacks.toml` is present and correct
- Verify `Procfile` syntax
- Ensure `backend/requirements.txt` exists

### Python not detected
- Confirm `runtime.txt` contains `python-3.11.9`
- Make sure `Procfile` starts with `web:`
- Check that `backend/main.py` exists

### Port binding error
- Railway assigns `$PORT` dynamically
- Our config uses `${PORT:-8000}` (defaults to 8000)
- Should work automatically

### "composer.json detected - building PHP"
- **Delete the Laravel/PHP service** from Railway dashboard
- Keep only the Python service
- Or create a new project with just the Python backend

## Local Development

```bash
# Terminal 1: Start backend
cd d:\AmplifyWebsite
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2: Start frontend  
cd frontend
npm run dev
```

Frontend will proxy to `localhost:8000` by default.

## Files Included

| File | Purpose |
|------|---------|
| `Procfile` | Tells Railway how to start the app |
| `runtime.txt` | Python version specification |
| `nixpacks.toml` | Detailed build & start config |
| `backend/requirements.txt` | Python dependencies |
| `backend/.env` | Local environment variables |
| `.railwayignore` | Tells Railway to ignore PHP files |

## URL Structure

After deployment:

```
Production Frontend: https://your-frontend.vercel.app
Production Backend:  https://your-backend.up.railway.app
Local Frontend:      http://localhost:5173
Local Backend:       http://localhost:8000
```

All API calls use relative paths (`/api`, `/turn`, `/generate`) so they work with any domain.
