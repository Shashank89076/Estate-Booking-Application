const express = require('express');
const multer = require('multer');
const path = require('path');
const session = require('express-session');
const crypto = require('crypto');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const { Slot, User, OTP, Note, Announcement, Profile } = require('./src/config');  // Import the Slot and User models from config.js

const app = express();

// Middleware to convert data into JSON format
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Session middleware
app.use(session({
    secret: 'yourSecretKey',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set secure to true if using HTTPS
}));

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'views')));
app.use(express.static(path.join(__dirname, 'images'))); // Ensure images directory is served

// Use EJS as the view engine
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');
app.set('views', path.join(__dirname, 'views'));

// Serve Main-2.html on the root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views/Main-2.html'));
});

// Signup route
app.get("/signup", (req, res) => {
    res.render("signup");
});

// Register User
app.post("/signup", async (req, res) => {
    const data = {
        name: req.body.username,
        email: req.body.email,
        password: req.body.password
    }

    console.log("Received data: ", data); // Log the received data

    // Check if the username already exists in the database
    const existingUser = await User.findOne({ name: data.name });

    if (existingUser) {
        res.status(400).send('Username is already taken.');
    } else {
        // Hash the password using bcrypt
        const saltRounds = 10; // Number of salt rounds for bcrypt
        const hashedPassword = await bcrypt.hash(data.password, saltRounds);

        data.password = hashedPassword; // Replace the original password with the hashed one
 // Auto-create an empty profile for the new user
        await Profile.create({
            username: data.name, // Use the username as the identifier
            firstName: '',
            lastName: '',
            phone: '',
            address: {
                line1: '',
                line2: '',
                city: '',
                state: '',
                country: '',
            },
            education: '',
        });
        await User.insertMany(data);
        req.session.username = req.body.username; // Store username in session
        res.status(200).send('User registered successfully');
        // Store email in the session
        req.session.email = data.email;
    }
});

// Login user
app.post("/login", async (req, res) => {
    try {
        // Check if the username exists
        const user = await User.findOne({ name: req.body.username });
        if (!user) {
            return res.status(400).send("Invalid Login, username is incorrect");
        }

        // Compare provided password with the hashed password
        const isPasswordMatch = await bcrypt.compare(req.body.password, user.password);
        if (isPasswordMatch) {
            req.session.username = req.body.username; // Store username in session
            return res.status(200).send("Login successful");
        } else {
            return res.status(400).send("Invalid Login, password is wrong");
        }
    } catch (error) {
        console.error("Error during login:", error);
        return res.status(500).send("An error occurred");
    }
});


// Handle user logout without deleting the user from the database
app.post("/logout", (req, res) => {
    const { username } = req.body;

    console.log("Logout request received for user:", username); // Debugging statement

    // Clear the session
    req.session.destroy((err) => {
        if (err) {
            console.error("Error destroying session:", err); // Debugging statement
            return res.status(500).send("An error occurred while logging out");
        }

        console.log("Session destroyed for user:", username); // Debugging statement
        res.status(200).send("User logged out successfully");
    });
});

// Endpoint to book a slot
app.post('/book', async (req, res) => {
    const { field, date, timing, totalCost, numberOfSeats } = req.body;
    console.log("Received booking data:", { field, date, timing, totalCost, numberOfSeats });
    const user = req.session.username || 'Guest';

    try {
        const existingSlot = await Slot.findOne({ field, date, timing });
        if (existingSlot) {
            return res.status(400).send('Slot already booked');
        }

        // Fetch user details from the User collection
        const userDetails = await User.findOne({ name: user });
        if (!userDetails || !userDetails.email) {
            return res.status(400).send('User not found or email not available');
        }

        const slot = new Slot({
            field,
            date,
            timing,
            user,
            totalCost: Number(totalCost),  // Ensure the cost is stored as a number
            numberOfSeats: Number(numberOfSeats)  // Ensure seats are stored as a number
        });

        // Save the slot to the Slots-tut database
        await slot.save();

        const now = new Date();
        const expiry = new Date();
        if (date === 'Today') {
            expiry.setHours(24, 0, 0, 0); // Expire at midnight if it's for today
        } else {
            expiry.setDate(now.getDate() + 1);
            expiry.setHours(24, 0, 0, 0); // Expire at midnight of the next day
        }

         // Email booking details to the user
         const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'noisyduck1903@gmail.com',  // Replace with your email
                pass: 'fwaxzrxa jarnwjzi'   // Replace with your email password
            },
            tls: {
                rejectUnauthorized: false // Disable TLS certificate verification
            }
        });

        const mailOptions = {
            from: 'noisyduck1903@gmail.com',  // Sender's email
            to: userDetails.email,          // User's email retrieved from the database
            subject: 'Booking Confirmation',
            html: `
                <h3>Your Booking Details</h3>
                <p><strong>Field:</strong> ${field}</p>
                <p><strong>Date:</strong> ${date}</p>
                <p><strong>Timing:</strong> ${timing}</p>
                <p><strong>Total Cost:</strong> ₹${totalCost}</p>
                <p><strong>Seats:</strong> ${numberOfSeats}</p>
            `
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('Error sending confirmation email:', error);
                return res.status(500).send('Error sending confirmation email');
            } else {
                console.log('Booking confirmation email sent:', info.response);
                res.status(200).send('Slot booked successfully and email sent');
            }
        });

    } catch (error) {
        console.error('Error booking slot:', error);
        res.status(500).send('An error occurred while booking the slot');
    }
});


// Endpoint to get booked slots for a specific date and field
app.get('/booked-slots', async (req, res) => {
    const { field, date } = req.query;

    try {
        const bookedSlots = await Slot.find({ field, date });
        res.json(bookedSlots);
    } catch (error) {
        console.error('Error fetching booked slots:', error);
        res.status(500).send('An error occurred while fetching booked slots');
    }
});

// Define the /bookings endpoint
app.get('/bookings', async (req, res) => {
    const { username } = req.session;

    // Check if the username is available in the session
    if (!username) {
        return res.status(400).send('Please log in to view your bookings.');
    }

    try {
        // Check if the user is admin
        if (username === 'Admin') {
            // Admin can view all bookings
            const allBookings = await Slot.find();
            return res.json(allBookings);
        }

        // Regular users can only view their own bookings
        const userBookings = await Slot.find({ user: username });
        if (userBookings.length === 0) {
            return res.status(404).send('No bookings found.');
        }

        res.json(userBookings);
    } catch (error) {
        console.error('Error fetching bookings:', error);
        res.status(500).send('An error occurred while fetching bookings.');
    }
});



// Generate CAPTCHA
function generateCaptcha() {
    const captchaText = crypto.randomBytes(3).toString('hex');
    return captchaText;
}

// Serve the root URL with CAPTCHA form
app.get('/', (req, res) => {
    const captcha = generateCaptcha();
    req.session.captcha = captcha;
    res.sendFile(path.join(__dirname, 'views/signup.html'));
});

// Serve CAPTCHA verification page
app.get('/captcha.html', (req, res) => {
    const captcha = generateCaptcha();
    req.session.captcha = captcha;
    res.sendFile(path.join(__dirname, 'views/captcha.html'));
});

// Send CAPTCHA text to client
app.get('/captcha', (req, res) => {
    res.json({ captcha: req.session.captcha });
});

// Validate CAPTCHA response
app.post('/validate', (req, res) => {
    const { userInput } = req.body;
    if (userInput === req.session.captcha) {
        res.json({ success: true });
    } else {
        req.session.captcha = generateCaptcha(); // Generate new CAPTCHA on failure
        res.json({ success: false });
    }
});

// Handle signup form submission
app.post('/signup', (req, res) => {
    // Process the signup form submission here
    // For demonstration purposes, we just return a success message
    res.send('Signup successful!');
});

app.post('/request-otp', async (req, res) => {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
        return res.status(404).send('Email not found');
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Save OTP in the database
    const otpEntry = new OTP({ email, otp });
    await otpEntry.save();

    // Send OTP via email
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'noisyduck1903@gmail.com',
            pass: 'fwaxzrxa jarnwjzi',
        },
        tls: {
            rejectUnauthorized: false // Disable TLS certificate verification
        }
    });

    const mailOptions = {
        from: 'noisyduck1903@gmail.com',
        to: user.email,
        subject: 'Your OTP Code',
        text: `Your OTP code is ${otp}`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('Error sending OTP email:', error);
            return res.status(500).send('Error sending OTP');
        } else {
            console.log('OTP email sent:', info.response);
            res.status(200).send('OTP sent to your email');
        }
    });
});

app.post('/verify-otp', async (req, res) => {
    console.log('Request body:', req.body);  // Log the request body
    const { email, otp } = req.body;
    
    try {
        const otpEntry = await OTP.findOne({ email, otp });
        if (!otpEntry) {
            console.log('Invalid OTP:', otp);
            return res.status(400).send('Invalid OTP');
        }

        console.log('OTP verified:', otp);
        // OTP is valid, proceed to password reset
        res.status(200).send('OTP verified');
    } catch (error) {
        console.error('Error during OTP verification:', error);
        res.status(500).send('Server error');
    }
});

app.post('/reset-password', async (req, res) => {
    const { email, newPassword } = req.body;

    // Check if the new password is provided
    if (!email || !newPassword) {
        return res.status(400).send('Email and new password are required.');
    }

    // Password strength validation
    const passwordPattern = /^(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{6,}$/;
    if (!passwordPattern.test(newPassword)) {
        return res.status(400).send('Password must be at least 6 characters long and include at least one special character.');
    }

    try {
        // Check if the user exists
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).send('User not found');
        }

        // Hash the new password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

        // Update the password in the database
        const result = await User.updateOne(
            { email }, // Filter
            { $set: { password: hashedPassword } } // Update operation
        );

        // Verify the update
        if (result.modifiedCount === 0) {
            return res.status(500).send('Failed to update the password. Please try again.');
        }

        console.log('Password updated successfully for user:', email);
        res.status(200).send('Password reset successfully');
    } catch (error) {
        console.error('Error resetting password:', error);
        res.status(500).send('An error occurred while resetting the password');
    }
});


// Save note endpoint
app.post('/save-note', async (req, res) => {
    const { key, note } = req.body;
    const user = req.session.username || 'Guest';

    try {
        // Upsert (update if exists, insert if not)
        await Note.findOneAndUpdate(
            { user, key },
            { note },
            { upsert: true, new: true }
        );
        res.status(200).send('Note saved successfully');
    } catch (error) {
        console.error('Error saving note:', error);
        res.status(500).send('An error occurred while saving the note');
    }
});

// Load notes endpoint
app.get('/load-notes', async (req, res) => {
    const user = req.session.username || 'Guest';

    try {
        const notes = await Note.find({ user });
        res.json(notes);
    } catch (error) {
        console.error('Error loading notes:', error);
        res.status(500).send('An error occurred while loading the notes');
    }
});

app.get('/fetch-reminders', async (req, res) => {
    const user = req.session.username || 'Guest';
    const now = new Date();

    try {
        const reminders = await Note.find({
            user,
            reminded: false,
            key: { $lte: now.toISOString() }
        });

        // Mark reminders as sent
        await Note.updateMany({ user, reminded: false, key: { $lte: now.toISOString() } }, { reminded: true });

        res.json(reminders);
    } catch (error) {
        console.error('Error fetching reminders:', error);
        res.status(500).send('An error occurred while fetching reminders');
    }
});

// Set up storage engine
const storage = multer.diskStorage({
    destination: './uploads/', // Folder to store images
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

// Initialize upload
const upload = multer({
    storage: storage,
    limits: { fileSize: 9000000 }, // Limit file size to 1MB
    fileFilter: function (req, file, cb) {
        checkFileType(file, cb);
    }
}).single('imageURL');

// Check File Type
function checkFileType(file, cb) {
    // Allowed ext
    const filetypes = /jpeg|jpg|png|gif/;
    // Check ext
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    // Check mime
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb('Error: Images Only!');
    }
}

// Serve static files from the uploads folder
app.use('/uploads', express.static('uploads'));

// Middleware to check if user is Admin
function isAdmin(req, res, next) {
    if (req.session.username === "Admin") {
        next();
    } else {
        res.status(403).send('Access denied.');
    }
}
// Create Announcement (Admin only)
app.post('/create-announcement', isAdmin, (req, res) => {
    upload(req, res, async (err) => {
        if (err) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).send('Error: File size is too large. Please upload a file smaller than 5MB.');
            }
            console.error('Error uploading image:', err);
            return res.status(500).send('Error uploading image.');
        }

        const { title, description, date } = req.body;
        const createdBy = req.session.username;
        const imageURL = req.file ? `/uploads/${req.file.filename}` : '';

        // Create the announcement only if title, description, and date are provided
        try {
            const announcement = new Announcement({ title, description, date, imageURL, createdBy });

            // If imageURL is empty or undefined, you might want to perform additional logic
            if (!imageURL) {
                console.warn('No image was uploaded, proceeding without image.');
            }

            await announcement.save();
            res.status(201).send('Announcement created successfully');
        } catch (error) {
            console.error('Error creating announcement:', error);
            res.status(500).send('An error occurred while creating the announcement');
        }
    });
});


// Get All Announcements
app.get('/announcements', async (req, res) => {
    try {
        const announcements = await Announcement.find({ isActive: true }).sort({ date: -1 });
        res.json(announcements);
    } catch (error) {
        console.error('Error fetching announcements:', error);
        res.status(500).send('An error occurred while fetching announcements');
    }
});

// Delete Announcement (Admin only)
app.delete('/announcement/:id', isAdmin, async (req, res) => {
    try {
        await Announcement.findByIdAndDelete(req.params.id);
        res.status(200).send('Announcement deleted successfully');
    } catch (error) {
        console.error('Error deleting announcement:', error);
        res.status(500).send('An error occurred while deleting the announcement');
    }
});


function toggleMenu() {
    const menu = document.getElementById('menu');
    const overlay = document.getElementById('overlay');

    if (menu.style.left === '0px') {
        menu.style.left = '-300px';
        overlay.style.display = 'none';
    } else {
        menu.style.left = '0px';
        overlay.style.display = 'block';
    }
}

// Endpoint for uploading profile pictures
app.post('/upload-profile-pic', (req, res) => {
    upload(req, res, (err) => {
        if (err) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ error: 'File size is too large. Please upload a file smaller than 1MB.' });
            }
            console.error('Error uploading image:', err);
            return res.status(500).json({ error: 'Error uploading image.' });
        }

        // Return the file path to the client
        const filePath = `/uploads/${req.file.filename}`;
        res.status(200).json({ filePath });
    });
});

app.post('/save-profile', async (req, res) => {
    const { username } = req.session; // Get username from session
    if (!username) {
        return res.status(400).send('Username is required.');
    }
    const { firstName, lastName, phone, address, education } = req.body;

    // Validate phone number: Must be exactly 10 numeric digits
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(phone)) {
        return res.status(400).send('Invalid phone number. Please enter a 10-digit numeric mobile number.');
    }

    try {
        const updateData = {
            firstName,
            lastName,
            phone,
            address: {
                line1: address?.line1 || '',
                line2: address?.line2 || '',
                city: address?.city || '',
                state: address?.state || '',
                country: address?.country || ''
            },
            education
        };

        console.log('Updating profile with data:', updateData);


        const updatedProfile = await Profile.findOneAndUpdate(
            { username },
            { $set: updateData },
            { upsert: true, new: true } // Create if not exists, return updated profile
        );

        console.log('Updated profile:', updatedProfile);


        res.status(200).json({
            message: 'Profile updated successfully.',
            profile: updatedProfile
        });
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).send('An error occurred while updating the profile.');
    }
});



app.get('/get-profile', async (req, res) => {
    const { username } = req.session;

    if (!username) {
        console.error('Error: Username is missing in the session.');
        return res.status(400).send('Username is required.');
    }

    try {
        console.log('Fetching profile for username:', username);

        const profile = await Profile.findOne({ username });
        if (!profile) {
            return res.status(404).send('Profile not found.');
        }

        console.log('Fetched profile:', profile);


        res.status(200).json(profile);
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).send('An error occurred while fetching the profile.');
    }
});



// Define Port for Application
const port1 = 4000;
const port2 = 8080;

// Listen on port 4000
app.listen(port1, () => {
    console.log(`Server listening on port ${port1}`);
});

// Listen on port 8080
app.listen(port2, () => {
    console.log(`Server listening on port ${port2}`);
});








