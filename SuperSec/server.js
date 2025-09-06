// server.js
function verifyPassword(plainPassword) {
const salt = Buffer.from(saltBase64, 'base64');
const derived = crypto.pbkdf2Sync(plainPassword, salt, PBKDF2_ITERATIONS, KEY_LEN, PBKDF2_ALGO);
return derived.toString('base64') === hashBase64;
}


// === Middlewares ===
app.use(helmet());
app.use(compression());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser());


// Session: cookie is httpOnly (not readable by JS), secure flag set in production behind HTTPS
app.use(session({
name: 'sid',
secret: SESSION_SECRET,
resave: false,
saveUninitialized: false,
cookie: {
httpOnly: true,
secure: process.env.NODE_ENV === 'production', // requires HTTPS in production
sameSite: 'lax',
maxAge: 1000 * 60 * 60 // 1 hour
}
}));


// Rate limiter on auth routes to slow brute force
const authLimiter = rateLimit({
windowMs: 15 * 60 * 1000, // 15 minutes
max: 10,
message: { error: 'Too many login attempts, please try later.' }
});


// CSRF protection. We'll use cookie parser + csurf.
app.use(csurf({ cookie: false }));


// Serve static files from ./public
app.use(express.static(path.join(__dirname, 'public')));


// === Routes ===


// Helper: require authentication middleware
function requireAuth(req, res, next) {
if (req.session && req.session.authenticated) return next();
return res.status(401).send('Unauthorized');
}


// Endpoint to get CSRF token for the login form (optional)
app.get('/csrf-token', (req, res) => {
res.json({ csrfToken: req.csrfToken() });
});


// Login endpoint (rate-limited)
app.post('/login', authLimiter, (req, res) => {
const { username, password } = req.body;
if (!username || !password) return res.status(400).json({ error: 'Missing credentials' });


// Only compare server-side. The client never sees the real password or server hash.
if (username === HARDCODED_USERNAME && verifyPassword(password)) {
req.session.authenticated = true;
req.session.user = { username: HARDCODED_USERNAME };
return res.json({ ok: true });
}


return res.status(401).json({ error: 'Invalid credentials' });
});


app.post('/logout', (req, res) => {
req.session.destroy(() => {
res.clearCookie('sid');
res.json({ ok: true });
});
});


// Protected resource example
app.get('/app', requireAuth, (req, res) => {
// Serve the protected single-page app or content
res.sendFile(path.join(__dirname, 'public', 'app.html'));
});


// For all other not found
app.use((req, res, next) => {
res.status(404).send('Not Found');
});


// Error handler (including CSRF errors)
app.use((err, req, res, next) => {
if (err.code === 'EBADCSRFTOKEN') {
return res.status(403).json({ error: 'Invalid CSRF token' });
}
console.error(err);
res.status(500).json({ error: 'Server error' });
});


// Start server
app.listen(PORT, () => {
console.log(`Secure login server running on http://localhost:${PORT} (NODE_ENV=${process.env.NODE_ENV || 'development'})`);
});